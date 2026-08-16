import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lqr-shell">
      <Header />
      <div className="lqr-shell__content">{children}</div>
      <BottomNav />

      <style>{`
        .lqr-shell {
          position: relative;
          min-height: 100vh;
        }
        .lqr-shell__content {
          position: relative;
          z-index: 1;
        }
        @media (max-width: 720px) {
          .lqr-shell__content {
            padding-bottom: 96px;
          }
        }
      `}</style>
    </div>
  );
}
