export interface Module {
  id: number | string
  title: string
  objective: string
  description?: string
  durationMins: number
  type: "VIDEO" | "DOC" | "SLIDES"
  badges?: ("MANDATORY" | "NEW" | "UPDATED")[]
  teams: string[]
  progress: number // 0-100
  dueDate?: string
  contentEmbedUrl: string
  openUrl?: string
  thumbnailUrl?: string
  quizEmbedUrl?: string
  quizUrl?: string
  lastUpdated: string
  owner: string
  saved?: boolean
  assigned?: boolean
}

export interface CurrentUser {
  name: string
  email: string
  role: string
  team: string
  avatar?: string
}

export const currentUser: CurrentUser = {
  name: "Alex Kim",
  email: "alex.kim@company.com",
  role: "Software Engineer",
  team: "PDD Core Dev",
}

export const teams = [
  "PDD Core Dev",
  "QA",
  "Infra",
  "BA",
  "Mobile",
  "D9",
  "LMT",
]

export const mockModules: Module[] = [
  {
    id: 1,
    title: "Intro to CI/CD Pipelines",
    objective:
      "Understand the fundamentals of continuous integration and deployment to ship code faster and safer.",
    description:
      "This module covers the basics of setting up CI/CD pipelines using modern tooling. You will learn how to automate builds, run tests, and deploy to staging and production environments.",
    durationMins: 12,
    type: "VIDEO",
    badges: ["MANDATORY"],
    teams: ["PDD Core Dev", "Infra", "QA"],
    progress: 45,
    dueDate: "2026-02-20",
    contentEmbedUrl: "https://www.youtube.com/embed/scEDHsr3APg",
    quizEmbedUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSdExample1/viewform?embedded=true",
    lastUpdated: "2026-01-15",
    owner: "DevOps Team",
    assigned: true,
  },
  {
    id: 2,
    title: "Security Best Practices",
    objective:
      "Learn essential security practices to protect applications and user data from common vulnerabilities.",
    durationMins: 18,
    type: "SLIDES",
    badges: ["MANDATORY", "UPDATED"],
    teams: ["PDD Core Dev", "QA", "Infra", "Mobile", "D9"],
    progress: 0,
    dueDate: "2026-02-28",
    contentEmbedUrl:
      "https://docs.google.com/presentation/d/e/2PACX-1vQExample/embed?start=false&loop=false&delayms=3000",
    quizUrl: "https://forms.gle/exampleQuiz2",
    lastUpdated: "2026-02-01",
    owner: "Security Guild",
    assigned: true,
  },
  {
    id: 3,
    title: "React Performance Optimization",
    objective:
      "Master techniques to identify and resolve performance bottlenecks in React applications.",
    durationMins: 25,
    type: "VIDEO",
    badges: ["NEW"],
    teams: ["PDD Core Dev", "Mobile", "D9"],
    progress: 72,
    contentEmbedUrl: "https://www.youtube.com/embed/0FWknzmFpKo",
    lastUpdated: "2026-02-05",
    owner: "Frontend Guild",
  },
  {
    id: 4,
    title: "API Design Guidelines",
    objective:
      "Follow consistent patterns for designing REST and GraphQL APIs that are easy to consume and maintain.",
    durationMins: 10,
    type: "DOC",
    teams: ["PDD Core Dev", "BA", "Infra"],
    progress: 100,
    contentEmbedUrl:
      "https://docs.google.com/document/d/e/2PACX-1vQExample/pub?embedded=true",
    lastUpdated: "2025-12-10",
    owner: "Architecture Team",
  },
  {
    id: 5,
    title: "Onboarding: Day 1 Orientation",
    objective:
      "Get up to speed on company culture, tools, and your first-day setup checklist.",
    durationMins: 8,
    type: "VIDEO",
    badges: ["MANDATORY"],
    teams: ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
    progress: 0,
    contentEmbedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    quizEmbedUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSdExample5/viewform?embedded=true",
    lastUpdated: "2026-01-02",
    owner: "People Ops",
    assigned: true,
  },
  {
    id: 6,
    title: "Testing Strategies & Frameworks",
    objective:
      "Explore unit, integration, and E2E testing strategies to build confidence in your codebase.",
    durationMins: 20,
    type: "SLIDES",
    badges: ["UPDATED"],
    teams: ["PDD Core Dev", "QA", "Mobile"],
    progress: 15,
    contentEmbedUrl:
      "https://docs.google.com/presentation/d/e/2PACX-1vQExample6/embed?start=false&loop=false",
    quizUrl: "https://forms.gle/exampleQuiz6",
    lastUpdated: "2026-01-28",
    owner: "QA Guild",
    assigned: true,
  },
  {
    id: 7,
    title: "Cloud Infrastructure 101",
    objective:
      "Understand cloud concepts including compute, storage, and networking fundamentals.",
    durationMins: 30,
    type: "VIDEO",
    teams: ["Infra", "PDD Core Dev"],
    progress: 0,
    contentEmbedUrl: "https://www.youtube.com/embed/M988_fsOSWo",
    lastUpdated: "2025-11-20",
    owner: "Infra Team",
  },
  {
    id: 8,
    title: "Accessible UI Development",
    objective:
      "Build inclusive interfaces that work for everyone, meeting WCAG 2.1 AA standards.",
    durationMins: 15,
    type: "DOC",
    badges: ["NEW"],
    teams: ["PDD Core Dev", "Mobile", "D9"],
    progress: 30,
    contentEmbedUrl:
      "https://docs.google.com/document/d/e/2PACX-1vQExample8/pub?embedded=true",
    lastUpdated: "2026-02-08",
    owner: "Design Systems",
  },
  {
    id: 9,
    title: "Agile & Sprint Planning",
    objective:
      "Improve team velocity and collaboration through effective sprint planning and retrospectives.",
    durationMins: 14,
    type: "SLIDES",
    teams: ["BA", "PDD Core Dev", "QA", "LMT"],
    progress: 0,
    contentEmbedUrl:
      "https://docs.google.com/presentation/d/e/2PACX-1vQExample9/embed?start=false",
    lastUpdated: "2025-10-15",
    owner: "Agile CoE",
  },
  {
    id: 10,
    title: "Onboarding: Week 1 Deep Dive",
    objective:
      "Dive into your team's codebase, workflows, and key contacts during your first week.",
    durationMins: 22,
    type: "DOC",
    badges: ["MANDATORY"],
    teams: ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
    progress: 0,
    dueDate: "2026-03-01",
    contentEmbedUrl:
      "https://docs.google.com/document/d/e/2PACX-1vQExample10/pub?embedded=true",
    lastUpdated: "2026-01-05",
    owner: "People Ops",
    assigned: true,
  },
  {
    id: 11,
    title: "Mobile App Architecture Patterns",
    objective:
      "Evaluate and apply MVVM, Clean Architecture, and other patterns for scalable mobile apps.",
    durationMins: 16,
    type: "VIDEO",
    teams: ["Mobile", "D9"],
    progress: 60,
    contentEmbedUrl: "https://www.youtube.com/embed/lkCjKJ7aEI0",
    lastUpdated: "2026-01-22",
    owner: "Mobile Guild",
  },
  {
    id: 12,
    title: "Data Privacy & GDPR Compliance",
    objective:
      "Ensure your team handles personal data in compliance with GDPR and internal policies.",
    durationMins: 9,
    type: "SLIDES",
    badges: ["MANDATORY"],
    teams: ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
    progress: 0,
    dueDate: "2026-03-15",
    contentEmbedUrl:
      "https://docs.google.com/presentation/d/e/2PACX-1vQExample12/embed?start=false",
    quizEmbedUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSdExample12/viewform?embedded=true",
    lastUpdated: "2026-02-01",
    owner: "Legal & Compliance",
    assigned: true,
  },
  {
    id: 13,
    title: "Incident Response Playbook",
    objective:
      "Know how to respond to production incidents quickly and effectively with minimal user impact.",
    durationMins: 11,
    type: "DOC",
    badges: ["UPDATED"],
    teams: ["PDD Core Dev", "Infra", "QA"],
    progress: 0,
    contentEmbedUrl:
      "https://docs.google.com/document/d/e/2PACX-1vQExample13/pub?embedded=true",
    lastUpdated: "2026-02-06",
    owner: "SRE Team",
  },
  {
    id: 14,
    title: "Design System Components",
    objective:
      "Learn to use and contribute to the shared design system for consistent UI across products.",
    durationMins: 13,
    type: "VIDEO",
    badges: ["NEW"],
    teams: ["PDD Core Dev", "Mobile", "D9"],
    progress: 0,
    contentEmbedUrl: "https://www.youtube.com/embed/example14",
    lastUpdated: "2026-02-09",
    owner: "Design Systems",
    saved: true,
  },
  {
    id: 15,
    title: "Onboarding: Month 1 Review",
    objective:
      "Reflect on your first month, set goals, and meet with your manager for a check-in.",
    durationMins: 6,
    type: "DOC",
    teams: ["PDD Core Dev", "QA", "Infra", "BA", "Mobile", "D9", "LMT"],
    progress: 0,
    contentEmbedUrl:
      "https://docs.google.com/document/d/e/2PACX-1vQExample15/pub?embedded=true",
    lastUpdated: "2026-01-10",
    owner: "People Ops",
  },
]
