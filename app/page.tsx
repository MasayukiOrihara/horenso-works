import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SideMenu } from "@/components/side-menu";
import { SubPage } from "@/components/sub-page";
import { Navi } from "@/components/navi-header";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-zinc-100">
      <Header />
      <div className="flex flex-1">
        <SideMenu />
        <main className="flex-1 flex flex-col">
          <Navi />
          <SubPage />
          <Footer />
        </main>
      </div>
    </div>
  );
}
