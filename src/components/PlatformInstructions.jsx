"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Info, Code2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const platforms = [
  {
    key: "html",
    label: "HTML / Any Website",
    steps: [
      {
        title: "Copy the Script Tag",
        description: "Click the copy button below to copy your unique tracking script.",
        icon: <Code2 className="inline mr-1 text-primary" size={18} />,
      },
      {
        title: "Paste in <head>",
        description: "Open your website's HTML and paste the script inside the <head> section, just before </head>.",
        icon: <Info className="inline mr-1 text-blue-500" size={18} />,
      },
      {
        title: "Deploy & Track",
        description: "Save and deploy your site. All forms will be tracked automatically—no extra setup needed!",
        icon: <ExternalLink className="inline mr-1 text-green-600" size={18} />,
      },
    ],
    scriptTip: "Place this script in the <head> of every page you want to track.",
    instructions: (websiteId, origin) => `<script src="${origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`
  },
  {
    key: "wordpress",
    label: "WordPress",
    steps: [
      {
        title: "Go to Theme Editor",
        description: "In your WordPress admin, navigate to Appearance > Theme Editor.",
        icon: <Info className="inline mr-1 text-blue-500" size={18} />,
      },
      {
        title: "Edit header.php",
        description: "Find and open header.php. Paste the script below just before </head>.",
        icon: <Code2 className="inline mr-1 text-primary" size={18} />,
      },
      {
        title: "Update File",
        description: "Click 'Update File' to save. All forms will be tracked automatically!",
        icon: <ExternalLink className="inline mr-1 text-green-600" size={18} />,
      },
    ],
    scriptTip: "Paste this in header.php before </head>.",
    instructions: (websiteId, origin) => `<script src="${origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`
  },
  {
    key: "shopify",
    label: "Shopify",
    steps: [
      {
        title: "Edit Theme Code",
        description: "Go to Online Store > Themes > Edit code in your Shopify admin.",
        icon: <Info className="inline mr-1 text-blue-500" size={18} />,
      },
      {
        title: "Update theme.liquid",
        description: "Open theme.liquid and paste the script below just before </head>.",
        icon: <Code2 className="inline mr-1 text-primary" size={18} />,
      },
      {
        title: "Save & Track",
        description: "Save the file. All forms will be tracked automatically!",
        icon: <ExternalLink className="inline mr-1 text-green-600" size={18} />,
      },
    ],
    scriptTip: "Paste this in theme.liquid before </head>.",
    instructions: (websiteId, origin) => `<script src="${origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`
  },
  {
    key: "nextjs",
    label: "Next.js",
    steps: [
      {
        title: "Open Layout or Document",
        description: "Edit app/layout.js or pages/_document.js in your Next.js project.",
        icon: <Info className="inline mr-1 text-blue-500" size={18} />,
      },
      {
        title: "Insert Script in <Head>",
        description: "Add the script below inside the <Head> component.",
        icon: <Code2 className="inline mr-1 text-primary" size={18} />,
      },
      {
        title: "Deploy & Track",
        description: "Deploy your app. All forms will be tracked automatically!",
        icon: <ExternalLink className="inline mr-1 text-green-600" size={18} />,
      },
    ],
    scriptTip: "Add this inside <Head> in layout.js or _document.js.",
    instructions: (websiteId, origin) => `<script src="${origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`
  },
  {
    key: "react",
    label: "React (CRA/Vite)",
    steps: [
      {
        title: "Open public/index.html",
        description: "Edit public/index.html in your React project.",
        icon: <Info className="inline mr-1 text-blue-500" size={18} />,
      },
      {
        title: "Paste in <head>",
        description: "Paste the script below inside the <head> section, before </head>.",
        icon: <Code2 className="inline mr-1 text-primary" size={18} />,
      },
      {
        title: "Save & Deploy",
        description: "Save and deploy your app. All forms will be tracked automatically!",
        icon: <ExternalLink className="inline mr-1 text-green-600" size={18} />,
      },
    ],
    scriptTip: "Paste this in public/index.html before </head>.",
    instructions: (websiteId, origin) => `<script src="${origin}/tracker.js" data-website-id="${websiteId}" async defer></script>`
  },
];

export default function PlatformInstructions({ websiteId }) {
  const [copied, setCopied] = useState(null);
  const [origin, setOrigin] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setIsClient(true);
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isClient) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8 shadow-lg border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Info className="text-primary" size={22} /> Setup Instructions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-blue-50 dark:bg-zinc-900/40 rounded-lg border border-blue-200 dark:border-zinc-800 flex items-center gap-3">
          <Info className="text-blue-500" size={20} />
          <div>
            <b>How it works:</b> Add the script below to your site. It will automatically detect and track all form submissions. You can view and manage all leads in your dashboard. No coding required!
          </div>
        </div>
        <Tabs defaultValue={platforms[0].key} className="w-full">
          <TabsList className="mb-4 flex-wrap">
            {platforms.map((platform) => (
              <TabsTrigger key={platform.key} value={platform.key} className="min-w-[120px]">
                {platform.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {platforms.map((platform) => {
            const code = platform.instructions(websiteId, origin);
            return (
              <TabsContent key={platform.key} value={platform.key} className="pt-2">
                <ol className="mb-4 space-y-4">
                  {platform.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="mt-1">{step.icon}</span>
                      <div>
                        <span className="font-semibold">Step {idx + 1}: {step.title}</span>
                        <div className="text-muted-foreground text-sm">{step.description}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mb-2 flex items-center gap-2">
                  <Code2 className="text-primary" size={18} />
                  <span className="font-medium">Script Tag</span>
                  <span className="ml-2 text-xs text-muted-foreground">{platform.scriptTip}</span>
                </div>
                <div className="relative mb-3">
                  <pre className="bg-gray-900 text-white p-3 rounded-md overflow-x-auto text-xs select-all pr-12">
                    {code}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(code, platform.key)}
                    className="absolute top-2 right-2 flex gap-2 items-center z-10"
                  >
                    {copied === platform.key ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />} Copy
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <b>Need help?</b> See our <a href="https://docs.formtrack.com/setup" target="_blank" rel="noopener noreferrer" className="underline text-primary">detailed setup guide</a> or contact support.
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
} 