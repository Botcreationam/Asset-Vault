import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Library, Search, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const { isAuthenticated, login } = useAuth();

  const features = [
    {
      title: "Extensive Library",
      description: "Browse thousands of academic resources organized by program, year, and subject.",
      icon: Library,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Read for Free",
      description: "View any document, presentation, or note directly in your browser at no cost.",
      icon: BookOpen,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      title: "Unit-based Downloads",
      description: "Download resources for offline access using our fair unit-based credit system.",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Secure & Verified",
      description: "All content is uploaded and verified by administrators to ensure academic integrity.",
      icon: Shield,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ];

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl bg-primary text-primary-foreground min-h-[450px] flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Library background" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40" />
        </div>
        
        <div className="relative z-10 px-8 md:px-16 py-12 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 border-white/30 text-white/90 backdrop-blur-sm px-3 py-1 text-sm font-medium tracking-wide">
              The Premier Academic Vault
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-white">
              Unlock the Knowledge You Need to Succeed.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl leading-relaxed">
              AcadVault provides secure access to thousands of verified academic resources. Read online for free, or use your units to download materials for offline study.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 font-bold px-8 h-12 shadow-lg">
                <Link href="/browse">
                  Browse Library <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" onClick={login} className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 h-12 backdrop-blur-sm">
                  Log in to get started
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Search */}
      <section className="px-4 -mt-16 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto bg-card rounded-2xl shadow-xl border border-border p-3 flex items-center gap-2"
        >
          <div className="bg-secondary/30 p-3 rounded-xl ml-1">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <form 
            className="flex-1 flex"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get('q');
              if (q) window.location.href = `/search?q=${q}`;
            }}
          >
            <input 
              name="q"
              type="text" 
              placeholder="Search for courses, subjects, or specific documents..." 
              className="flex-1 bg-transparent border-none outline-none px-4 text-lg font-medium placeholder:text-muted-foreground focus:ring-0"
            />
            <Button type="submit" size="lg" className="rounded-xl px-8 font-semibold hidden sm:flex">
              Search
            </Button>
          </form>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-8">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">How AcadVault Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">A simple, fair system designed to give you the best access to academic materials.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
            >
              <Card className="h-full border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card group">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <CardTitle className="font-serif text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="bg-secondary/30 rounded-3xl p-8 md:p-12 text-center border border-secondary/50">
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">Ready to start studying?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
            Join thousands of students accessing premium academic resources today.
          </p>
          <Button size="lg" onClick={login} className="font-bold px-10 h-14 rounded-xl text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
            Create an Account or Log In
          </Button>
        </section>
      )}
    </div>
  );
}

// Reusing badge from UI for convenience within this file context
function Badge({ className, variant, ...props }: any) {
  return <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`} {...props} />
}
