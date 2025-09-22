'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Rocket,
  Shield,
  Zap,
  Users,
  MessageSquare,
  Brain,
  Globe,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Github,
  BookOpen,
  Settings,
  PlayCircle,
  Menu
} from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Setup Guide', href: '/setup' },
    { name: 'Documentation', href: '/help' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Login', href: '/login' },
  ];

  const features = [
    {
      title: 'AI-Powered Personalization',
      description: 'GPT-5 Nano creates unique messages for each prospect',
      icon: Brain,
      color: 'text-purple-500',
    },
    {
      title: 'Anti-Detection Technology',
      description: 'Human-like behavior that bypasses LinkedIn\'s detection',
      icon: Shield,
      color: 'text-green-500',
    },
    {
      title: 'Campaign Management',
      description: 'Create, monitor, and optimize outreach campaigns',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Real-Time Analytics',
      description: 'Track response rates and campaign performance',
      icon: Zap,
      color: 'text-yellow-500',
    },
    {
      title: 'Bulk Operations',
      description: 'Process thousands of prospects efficiently',
      icon: MessageSquare,
      color: 'text-red-500',
    },
    {
      title: 'Secure & Private',
      description: 'Your data encrypted and stored securely',
      icon: Settings,
      color: 'text-indigo-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">LinkedIn Messenger</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <Button size="sm" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Button size="sm" className="w-full mt-2" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            LinkedIn Outreach on
            <span className="text-primary"> Autopilot</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered messaging platform that personalizes, sends, and manages LinkedIn conversations at scale
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" asChild>
              <Link href="/setup">
                <Rocket className="mr-2 h-5 w-5" />
                View Setup Guide
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="https://github.com/JohnConnorCode/Linkedin-messenger" target="_blank">
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              100% Tested
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Production Ready
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Open Source
            </span>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Globe className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Web Application</CardTitle>
              <CardDescription>Cloud-based control center</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Campaign creation and management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>AI message personalization</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Real-time analytics dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Target list management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Deploy to Vercel in minutes</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Terminal className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Desktop Runner</CardTitle>
              <CardDescription>Local automation engine</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Executes LinkedIn automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Uses your residential IP address</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Human-like behavior patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Anti-detection measures</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Rate limiting & circuit breaker</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <Icon className={`h-8 w-8 ${feature.color} mb-2`} />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-12 md:py-20">
        <Card className="max-w-3xl mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-base">
              Follow our comprehensive setup guide to deploy in minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/setup">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Setup Guide
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/help">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Documentation
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>

            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-4">Quick Links</p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link href="/setup" className="text-primary hover:underline">
                  Installation
                </Link>
                <Link href="/setup#environment" className="text-primary hover:underline">
                  Environment Setup
                </Link>
                <Link href="/setup#usage" className="text-primary hover:underline">
                  How to Use
                </Link>
                <Link href="/help" className="text-primary hover:underline">
                  Help Center
                </Link>
                <Link href="https://github.com/JohnConnorCode/Linkedin-messenger/issues" target="_blank" className="text-primary hover:underline">
                  Report Issues
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">LinkedIn Messenger</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/setup" className="hover:text-foreground">
                Setup
              </Link>
              <Link href="/help" className="hover:text-foreground">
                Docs
              </Link>
              <Link href="https://github.com/JohnConnorCode/Linkedin-messenger" target="_blank" className="hover:text-foreground">
                GitHub
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}