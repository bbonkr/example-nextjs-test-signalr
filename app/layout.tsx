import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignalR Hub Tester",
  description: "Arbitrary SignalR hub function call test client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
