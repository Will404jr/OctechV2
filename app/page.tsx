import { redirect } from "next/navigation";
import { ClientSideNavigation } from "./ClientSideNavigation";

async function getSettings() {
  try {
    const res = await fetch("http://localhost:3000/api/hospital/settings", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch settings");
    const data = await res.json();
    return Object.keys(data).length > 0 ? data : null;
  } catch (error) {
    console.error("Error fetching settings:", error);
    return null;
  }
}

export default async function HomePage() {
  const settings = await getSettings();

  if (!settings) {
    redirect("/hospital/settingsForm");
  }

  return <ClientSideNavigation settings={settings} />;
}
