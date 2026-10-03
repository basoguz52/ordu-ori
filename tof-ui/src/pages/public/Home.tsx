import { Link } from "react-router-dom";
import { Compass, CalendarDays, Trophy, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Carousel } from "@/components/Carousel";
import { EventsCalendar } from "@/components/EventsCalendar";

const features = [
  {
    to: "/yarisma-bulteni",
    icon: CalendarDays,
    title: "Yarışmalar",
    desc: "Yaklaşan yarışlar, bülten ve kayıt.",
  },
  {
    to: "/sonuclar",
    icon: Trophy,
    title: "Sonuçlar",
    desc: "Canlı, ara ve resmi sonuçlar.",
  },
  {
    to: "/kurumsal/kuluplerimiz",
    icon: Users,
    title: "Kulüplerimiz",
    desc: "Ordu’daki oryantiring kulüpleri.",
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <Carousel />

      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-8 sm:p-12">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass className="size-3.5" /> Ordu İl Temsilciliği
          </span>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ordu Oryantiring
          </h1>
          <p className="text-lg text-muted-foreground">
            Yarışma kayıtları, güncel sonuçlar ve duyurular tek yerde.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/yarisma-bulteni" className={buttonVariants({ size: "lg" })}>
              Yarışmalar
            </Link>
            <Link
              to="/sonuclar"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Sonuçlar
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Link key={f.to} to={f.to} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
              <CardHeader>
                <f.icon className="mb-2 size-6 text-primary" />
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>

      <EventsCalendar />
    </div>
  );
}
