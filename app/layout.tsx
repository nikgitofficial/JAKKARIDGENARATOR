import type { Metadata } from "next";
import TypeNav from "@/components/TypeNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ID Generator",
  description: "Fill in employee details and download the ID as a Word document.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TypeNav />
        {children}
      </body>
    </html>
  );
}