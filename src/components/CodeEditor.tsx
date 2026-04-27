import { CODING_QUESTIONS, LANGUAGES } from "@/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircleIcon, BookIcon, LightbulbIcon } from "lucide-react";
import { Button } from "./ui/button";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Whiteboard from "./Whiteboard";

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

const normalizeFallbackQuestions = (): EditorProblem[] => {
  return CODING_QUESTIONS.map((question) => ({
    id: question.id,
    title: question.title,
    description: question.description,
    examples: question.examples,
    constraints: question.constraints,
    starterCode: question.starterCode,
  }));
};

function CodeEditor() {
  const { user } = useUser();
  const params = useParams();
  const roomId = useMemo(() => {
    const rawId = params?.id;
    if (!rawId) return "";
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);

  const [selectedQuestion, setSelectedQuestion] = useState(CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<SupportedLanguage>(LANGUAGES[0].id);
  const [code, setCode] = useState(EMPTY_EDITOR_CODE[language]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      return normalizeFallbackQuestions();
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

    return mapped.length > 0 ? mapped : normalizeFallbackQuestions();
  }, [interview?.problems, predefinedProblems]);

  useEffect(() => {
    if (availableQuestions.length === 0) return;

    const isCurrentAvailable = availableQuestions.some((item) => item.id === selectedQuestion.id);
    if (isCurrentAvailable) return;

    const firstQuestion = availableQuestions[0];
    setSelectedQuestion(firstQuestion);
    setCode(EMPTY_EDITOR_CODE[language]);
  }, [availableQuestions, selectedQuestion.id, language]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    if (session.updatedBy === user?.id) return;

    const question =
      availableQuestions.find((q) => q.id === session.questionId) ?? availableQuestions[0];

    if (!question) return;

    if (question.id !== selectedQuestion.id) {
      setSelectedQuestion(question);
    }

    if (session.language !== language) {
      setLanguage(session.language);
    }

    if (session.code !== code) {
      setCode(session.code);
    }
  }, [session, user?.id, selectedQuestion.id, language, code, availableQuestions]);

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

    queueSync({ questionId: selectedQuestion.id, language: newLanguage, code: nextCode });
  };

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc-100vh-4rem-1px]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
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
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      {(isEditorOpen || isWhiteboardOpen) && (
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
                    queueSync({ questionId: selectedQuestion.id, language, code: nextCode });
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
