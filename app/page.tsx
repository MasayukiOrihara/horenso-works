import { Header } from "@/components/parts/header";
import { Footer } from "@/components/parts/footer";
import { SideMenu } from "@/components/parts/side-menu";
import { SubPage } from "@/components/sub-page";
import { Navi } from "@/components/NaviHeader";
import { ProfileModal } from "@/components/ProfileModal/ProfileModal";
import { StartButtonProvider } from "@/components/provider/StartButtonProvider";
import { SettingsProvider } from "@/components/provider/SettingsProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary/ErrorBoundary";
import { ErrorBanner } from "@/components/error/ErrorBanner/ErrorBanner";

export default function Home() {
  return (
    <ErrorBoundary>
      <ErrorBanner />
      <div className="h-screen flex flex-col bg-zinc-100">
        <Header />
        <div className="flex flex-1">
          <StartButtonProvider>
            <SideMenu />
            <ProfileModal />
            <main className="flex-1 flex flex-col">
              <SettingsProvider>
                <Navi />
                <SubPage />
                <Footer />
              </SettingsProvider>
            </main>
          </StartButtonProvider>
        </div>
      </div>
    </ErrorBoundary>
  );
}
