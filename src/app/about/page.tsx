import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckCircle, Globe, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Header */}
        <section className="w-full py-16 px-4 bg-gradient-to-b from-card/50 to-background">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About <span className="text-primary">AstroKalki</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connecting ancient wisdom with modern technology for cosmic
              guidance
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Our Mission</h2>
                <p className="text-lg text-foreground leading-relaxed">
                  AstroKalki is dedicated to making astrology accessible,
                  accurate, and empowering for everyone. We believe in the
                  profound wisdom of the cosmos and its ability to guide us
                  toward our true potential.
                </p>
                <p className="text-lg text-foreground leading-relaxed">
                  By combining thousands of years of astrological knowledge with
                  cutting-edge technology, we provide personalized insights that
                  help you navigate life&apos;s challenges and embrace
                  opportunities.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { number: "500K+", label: "Happy Users" },
                  { number: "10K+", label: "Daily Readings" },
                  { number: "99.9%", label: "Accuracy" },
                  { number: "24/7", label: "Support" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-6 rounded-lg bg-card border border-card-foreground/10 text-center"
                  >
                    <p className="text-3xl font-bold text-primary mb-2">
                      {stat.number}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="w-full py-20 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-16">Our Values</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Globe,
                  title: "Authenticity",
                  description:
                    "We honor the integrity of ancient astrological traditions",
                },
                {
                  icon: Zap,
                  title: "Innovation",
                  description:
                    "We leverage modern technology for better accuracy",
                },
                {
                  icon: Users,
                  title: "Community",
                  description: "We build a supportive global community of seekers",
                },
                {
                  icon: CheckCircle,
                  title: "Excellence",
                  description:
                    "We deliver the highest quality readings and insights",
                },
              ].map((value) => {
                const IconComponent = value.icon;
                return (
                  <div
                    key={value.title}
                    className="p-6 rounded-lg bg-background border border-card-foreground/10 text-center space-y-3"
                  >
                    <div className="flex justify-center">
                      <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="w-full py-20 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Our Team</h2>
              <p className="text-lg text-muted-foreground">
                Expert astrologers and technologists united by passion
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Dr. Anisha Sharma",
                  role: "Lead Astrologer",
                  specialty: "Vedic Astrology",
                },
                {
                  name: "Rajesh Kumar",
                  role: "Technology Director",
                  specialty: "Astronomical Calculations",
                },
                {
                  name: "Priya Desai",
                  role: "Tarot & Numerology",
                  specialty: "Holistic Guidance",
                },
              ].map((member) => (
                <div
                  key={member.name}
                  className="p-6 rounded-lg bg-card border border-card-foreground/10 text-center space-y-3"
                >
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-full" />
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className="text-sm font-semibold text-primary">
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.specialty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="w-full py-20 px-4 bg-card/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Choose AstroKalki?
            </h2>

            <div className="space-y-4">
              {[
                "Accurate calculations based on NASA data and astronomical precision",
                "Personalized readings considering your complete birth chart",
                "Expert interpretations from certified astrologers",
                "Confidential and secure data handling",
                "Regular updates reflecting current cosmic events",
                "Supportive community and accessible guidance",
              ].map((reason, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-lg bg-background border border-card-foreground/10"
                >
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-foreground">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
