import { LANGUAGES } from "@/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircleIcon, BookIcon, LightbulbIcon, EyeIcon, EyeOffIcon, LockIcon, ClockIcon } from "lucide-react";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Whiteboard from "./Whiteboard";
import { useUserRole } from "@/hooks/useUserRole";

type SupportedLanguage = "javascript" | "python" | "java";

const EMPTY_EDITOR_CODE: Record<SupportedLanguage, string> = {
  javascript: "",
  python: "",
  java: "",
};

type EditorProblem = {
  id: string;
  title: string;
  description: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints?: string[];
  starterCode: {
    javascript: string;
    python: string;
    java: string;
  };
};

const defaultStarterCode = {
  javascript: "function solve(input) {\n  // Write your solution here\n\n}",
  python: "def solve(input):\n    # Write your solution here\n    pass",
  java: "class Solution {\n    public void solve(Object input) {\n        // Write your solution here\n\n    }\n}",
};

function CodeEditor() {
  const { user } = useUser();
  const { isInterviewer, isCandidate } = useUserRole();
  const params = useParams();
  const roomId = useMemo(() => {
    const rawId = params?.id;
    if (!rawId) return "";
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [selectedQuestion, setSelectedQuestion] = useState<EditorProblem | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>(LANGUAGES[0].id);
  const [code, setCode] = useState(EMPTY_EDITOR_CODE[language]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problemVisibility = useQuery(
    (api as any).codeSessions.getProblemVisibilityByRoomId,
    roomId ? { roomId } : "skip"
  );
  const setProblemVisibility = useMutation((api as any).codeSessions.setProblemVisibility);

  const isProblemVisible = problemVisibility?.isVisible ?? false;

  const handleToggleProblemVisibility = () => {
    const nextVisible = !isProblemVisible;
    if (!roomId) return;

    void setProblemVisibility({ roomId, isVisible: nextVisible }).catch((error) => {
      console.error("Failed to update problem visibility:", error);
    });
  };

  const interview = useQuery(
    api.interviews.getInterviewByStreamCallId,
    roomId ? { streamCallId: roomId } : "skip"
  );
  const predefinedProblems = useQuery(api.problems.getAllProblems) ?? [];
  const session = useQuery(
    api.codeSessions.getSessionByRoomId,
    roomId ? { roomId } : "skip"
  );
  const upsertSession = useMutation(api.codeSessions.upsertSession);

  const availableQuestions = useMemo<EditorProblem[]>(() => {
    if (!interview?.problems || interview.problems.length === 0) {
      return [];
    }

    const mapped = interview.problems
      .map((problem, index) => {
        if (problem.type === "predefined") {
          const matched = predefinedProblems.find(
            (item) => String(item._id) === String(problem.problemId)
          );
          if (!matched) return null;

          return {
            id: matched._id,
            title: matched.title,
            description: matched.description,
            examples: matched.examples,
            constraints: matched.constraints,
            starterCode: matched.starterCode,
          } as EditorProblem;
        }

        return {
          id: `custom-${index}`,
          title: problem.title,
          description: problem.description,
          examples: problem.examples,
          constraints: problem.constraints,
          starterCode: problem.starterCode ?? defaultStarterCode,
        } as EditorProblem;
      })
      .filter((item): item is EditorProblem => item !== null);

    return mapped;
  }, [interview?.problems, predefinedProblems]);

  useEffect(() => {
    if (availableQuestions.length === 0) {
      if (selectedQuestion !== null) {
        setSelectedQuestion(null);
      }
      return;
    }

    const isCurrentAvailable = selectedQuestion
      ? availableQuestions.some((item) => item.id === selectedQuestion.id)
      : false;
    if (isCurrentAvailable) return;

    const firstQuestion = availableQuestions[0];
    setSelectedQuestion(firstQuestion);
    setCode(EMPTY_EDITOR_CODE[language]);
  }, [availableQuestions, selectedQuestion, language]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session || availableQuestions.length === 0) return;

    if (session.updatedBy === user?.id) return;

    const question =
      availableQuestions.find((q) => q.id === session.questionId) ?? availableQuestions[0];

    if (!question) return;

    if (question.id !== selectedQuestion?.id) {
      setSelectedQuestion(question);
    }

    if (session.language !== language) {
      setLanguage(session.language);
    }

    if (session.code !== code) {
      setCode(session.code);
    }
  }, [session, user?.id, selectedQuestion, language, code, availableQuestions]);

  const queueSync = (payload: {
    questionId: string;
    language: SupportedLanguage;
    code: string;
  }) => {
    if (!roomId) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      upsertSession({ roomId, ...payload }).catch((error) => {
        console.error("Failed to sync code session:", error);
      });
    }, 150);
  };

  const handleQuestionChange = (questionId: string) => {
    if (!isInterviewer) return;

    const question = availableQuestions.find((q) => q.id === questionId);
    if (!question) return;
    const nextCode = EMPTY_EDITOR_CODE[language];

    setSelectedQuestion(question);
    setCode(nextCode);

    queueSync({ questionId: question.id, language, code: nextCode });
  };

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    const nextCode = EMPTY_EDITOR_CODE[newLanguage];

    setLanguage(newLanguage);
    setCode(nextCode);

    if (selectedQuestion) {
      queueSync({ questionId: selectedQuestion.id, language: newLanguage, code: nextCode });
    }
  };

  // Whether this user can see the problem section
  const canSeeProblem = isInterviewer || isProblemVisible;
  const canOpenWorkspace = Boolean(selectedQuestion);
  const workspaceButtons = canOpenWorkspace ? (
    <>
      <Button
        type="button"
        variant={isEditorOpen ? "secondary" : "default"}
        onClick={() => {
          setIsWhiteboardOpen(false);
          setIsEditorOpen((prev) => !prev);
        }}
      >
        {isEditorOpen ? "Close Editor" : "Open Editor"}
      </Button>

      <Button
        type="button"
        variant={isWhiteboardOpen ? "secondary" : "default"}
        onClick={() => {
          setIsEditorOpen(false);
          setIsWhiteboardOpen((prev) => !prev);
        }}
      >
        {isWhiteboardOpen ? "Close Whiteboard" : "Open Whiteboard"}
      </Button>
    </>
  ) : null;

  useEffect(() => {
    if (isCandidate && !canSeeProblem) {
      setIsEditorOpen(false);
      setIsWhiteboardOpen(false);
    }
  }, [isCandidate, canSeeProblem]);

  useEffect(() => {
    if (!canOpenWorkspace) {
      setIsEditorOpen(false);
      setIsWhiteboardOpen(false);
    }
  }, [canOpenWorkspace]);

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc-100vh-4rem-1px]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">

              {/* INTERVIEWER TOGGLE BUTTON */}
              {isInterviewer && (
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {isProblemVisible ? (
                      <EyeIcon className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <EyeOffIcon className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        Problem Visibility
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isProblemVisible
                          ? "Candidate can see the problem"
                          : "Problem is hidden from candidate"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={isProblemVisible ? "outline" : "default"}
                    size="sm"
                    onClick={handleToggleProblemVisibility}
                    className="gap-2"
                  >
                    {isProblemVisible ? (
                      <>
                        <EyeOffIcon className="h-4 w-4" />
                        Hide Problem
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4" />
                        Show Problem
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* PROBLEM CONTENT — visible to interviewer always, candidate only when toggled */}
              {canSeeProblem ? (
                <>
                  {selectedQuestion ? (
                    <>
                  {/* HEADER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight">
                          {selectedQuestion.title}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Choose your language and solve the problem
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isInterviewer ? (
                        <Select value={selectedQuestion.id} onValueChange={handleQuestionChange}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select question" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableQuestions.map((q) => (
                              <SelectItem key={q.id} value={q.id}>
                                {q.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}

                      <Select value={language} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-[150px]">
                          {/* SELECT VALUE */}
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <img
                                src={`/${language}.png`}
                                alt={language}
                                className="w-5 h-5 object-contain"
                              />
                              {LANGUAGES.find((l) => l.id === language)?.name}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        {/* SELECT CONTENT */}
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id}>
                              <div className="flex items-center gap-2">
                                <img
                                  src={`/${lang.id}.png`}
                                  alt={lang.name}
                                  className="w-5 h-5 object-contain"
                                />
                                {lang.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {workspaceButtons}
                    </div>
                  </div>

                  {/* PROBLEM DESC. */}
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <BookIcon className="h-5 w-5 text-primary/80" />
                      <CardTitle>Problem Description</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-relaxed">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* PROBLEM EXAMPLES */}
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2">
                      <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                      <CardTitle>Examples</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-full w-full rounded-md border">
                        <div className="p-4 space-y-4">
                          {selectedQuestion.examples.map((example, index) => (
                            <div key={index} className="space-y-2">
                              <p className="font-medium text-sm">Example {index + 1}:</p>
                              <ScrollArea className="h-full w-full rounded-md">
                                <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                                  <div>Input: {example.input}</div>
                                  <div>Output: {example.output}</div>
                                  {example.explanation && (
                                    <div className="pt-2 text-muted-foreground">
                                      Explanation: {example.explanation}
                                    </div>
                                  )}
                                </pre>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            </div>
                          ))}
                        </div>
                        <ScrollBar />
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* CONSTRAINTS */}
                  {selectedQuestion.constraints && (
                    <Card>
                      <CardHeader className="flex flex-row items-center gap-2">
                        <AlertCircleIcon className="h-5 w-5 text-blue-500" />
                        <CardTitle>Constraints</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1.5 text-sm marker:text-muted-foreground">
                          {selectedQuestion.constraints.map((constraint, index) => (
                            <li key={index} className="text-muted-foreground">
                              {constraint}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                    </>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>No Problems Assigned</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        This interview does not have any assigned problems yet.
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                /* CANDIDATE WAITING PLACEHOLDER */
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                      <LockIcon className="h-8 w-8 text-primary/70" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight mb-2">
                    Problem Not Yet Shared
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                    The interviewer hasn&apos;t shared the problem yet. Please wait — it will appear here automatically once shared.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                    {workspaceButtons}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 bg-muted/40 rounded-full px-4 py-2">
                    <ClockIcon className="h-3.5 w-3.5 animate-pulse" />
                    <span>Waiting for interviewer to share the problem…</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      {canOpenWorkspace && (isEditorOpen || isWhiteboardOpen) && (
        <>
          <ResizableHandle withHandle />

          {/* WORKSPACE PANEL */}
          <ResizablePanel defaultSize={60} maxSize={100}>
            <div className="h-full relative">
              {isWhiteboardOpen ? (
                <Whiteboard
                  roomId={roomId}
                  onClose={() => setIsWhiteboardOpen(false)}
                />
              ) : (
                <Editor
                  height={"100%"}
                  defaultLanguage={language}
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => {
                    const nextCode = value || "";

                    setCode(nextCode);
                    if (selectedQuestion) {
                      queueSync({ questionId: selectedQuestion.id, language, code: nextCode });
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 18,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    wordWrap: "on",
                    wrappingIndent: "indent",
                  }}
                />
              )}
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
export default CodeEditor;
