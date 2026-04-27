import StreamClientProvider from "@/components/providers/StreamClientProvider";
import Navbar from "@/components/Navbar";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import RoleGate from "@/components/RoleGate";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <div className="min-h-screen">
          <Navbar />
          <main className="px-4 sm:px-6 lg:px-8">
            <RoleGate>
              <StreamClientProvider>{children}</StreamClientProvider>
            </RoleGate>
          </main>
        </div>
      </SignedIn>

      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
export default Layout;
