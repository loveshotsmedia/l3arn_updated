import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L3ARN — Parent-Controlled AI Homeschool OS",
  description:
    "Parents run a personalized AI-powered homeschool while children learn through standards-aware missions inside a living 3D Academy.",
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
