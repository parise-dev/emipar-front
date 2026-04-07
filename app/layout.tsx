// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "EMIPAR LIFE CRM",
  description: "CRM EMIPAR LIFE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}