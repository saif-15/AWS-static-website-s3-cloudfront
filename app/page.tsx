import { HomeExperience } from "@/components/home/home-experience";

export default function HomePage() {
  return (
    <main id="main">
      <HomeExperience />
      <noscript>
        <p style={{ position: "fixed", bottom: 16, left: 16, right: 16, textAlign: "center" }}>
          World Clock needs JavaScript to show live times. City pages are listed in the sitemap.
        </p>
      </noscript>
    </main>
  );
}
