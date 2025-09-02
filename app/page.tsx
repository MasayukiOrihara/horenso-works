import { Header } from "@/components/parts/header";
import { Footer } from "@/components/parts/footer";
import { SideMenu } from "@/components/parts/side-menu";
import { SubPage } from "@/components/sub-page";
import { Navi } from "@/components/NaviHeader";
import { StartButton } from "@/components/StartButton/StartButton";
import { StartButtonProvider } from "@/components/provider/start-button-provider";
import { SettingsProvider } from "@/components/provider/SettingsProvider";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-zinc-100">
      <Header />
      <div className="flex flex-1">
        <StartButtonProvider>
          <SideMenu />
          <StartButton />
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
  );
}
