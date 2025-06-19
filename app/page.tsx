import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SideMenu } from "@/components/side-menu";
import { SubPage } from "@/components/sub-page";
import { Navi } from "@/components/navi-header";
import { StartButton } from "@/components/start-button";
import { SwitchProvider } from "@/components/provider/switch-provider";
import { StartButtonProvider } from "@/components/provider/start-button-provider";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-zinc-100">
      <Header />
      <div className="flex flex-1">
        <StartButtonProvider>
          <SideMenu />
          <StartButton />
          <main className="flex-1 flex flex-col">
            <SwitchProvider>
              <Navi />
              <SubPage />
              <Footer />
            </SwitchProvider>
          </main>
        </StartButtonProvider>
      </div>
    </div>
  );
}
