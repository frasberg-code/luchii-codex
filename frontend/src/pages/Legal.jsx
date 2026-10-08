import React from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const SEP = "Luchii is the platform operated by Frasberg, Inc. Luchii Models are separate Frasberg-owned AI models. Luchii uses Luchii Models and Frasberg LLM internally. Luchii Models are not Luchii.";

const DOCS = {
  privacy: {
    title: "Privacy Policy",
    group: "Legal",
    body: [
      SEP,
      "We collect only what is necessary to operate Luchii: account information (email, username, credentials), usage information (tool usage, generation requests, device metadata), and the content you generate.",
      "We use this information to provide platform functionality, improve the service, maintain security, and prevent abuse. We do not sell personal data, do not use your content to train external models, and do not use third-party token systems.",
      "All processing occurs within Frasberg-controlled infrastructure. You may request account deletion or data export at privacy@frasberg.com. Luchii is not intended for children under 13.",
    ],
  },
  terms: {
    title: "Terms of Service",
    group: "Legal",
    body: [
      SEP,
      "By using Luchii you agree to these Terms. You retain full ownership of the content you create; Frasberg does not claim ownership over your images, videos, audio, 3D assets, prompts, or outputs. You grant a limited license to process your content solely to operate the platform.",
      "You may not use Luchii to generate illegal, harmful, abusive, or IP-violating content, or deceptive deepfakes. Frasberg may restrict access for violations.",
      "All models, code, and infrastructure are owned by Frasberg, Inc. The service is provided \u201cas-is.\u201d Contact terms@frasberg.com.",
    ],
  },
  cookies: {
    title: "Cookies Policy",
    group: "Legal",
    body: [
      SEP,
      "Luchii uses minimal cookies for platform functionality and security \u2014 essential cookies for login, authentication, and session stability.",
      "We use first-party analytics only. No external analytics providers or advertising trackers receive your data. You may disable cookies in your browser settings, though some features may not work correctly.",
      "Contact cookies@frasberg.com.",
    ],
  },
  "model-disclosure": {
    title: "AI Model Usage Disclosure",
    group: "Governance",
    body: [
      SEP,
      "The Luchii Models suite includes the Luchii Image, Video, Audio, Speech-to-Speech, Sound Effects, VoiceFX, 3D, and Spaces models. These are separate Frasberg-owned AI models used internally by Luchii.",
      "Generated content is processed only to deliver platform functionality. We do not use your content to train external models. We implement prompt safety filters, output moderation, abuse detection, and identity-protection safeguards.",
    ],
  },
  "identity-separation": {
    title: "Identity Separation",
    group: "Governance",
    body: [
      SEP,
      "Identity separation is a constitutional requirement of the Frasberg ecosystem — not a branding guideline. It is enforced across every layer: interface, backend, prompts, and documentation.",
      "Luchii is the platform (the Navigator) that guides you through your creative work. Luchii Models are separate Frasberg-owned AI models (the Luminaries) that generate images, video, audio, voice, 3D, and spaces. Frasberg LLM is the semantic foundation.",
      "These identities are never merged. Luchii Models are never described as Luchii, and ownership is never reattributed. This separation is permanent and cannot be altered by any agent, model, or future system.",
    ],
  },
  "creator-codex": {
    title: "Creator Codex",
    group: "Governance",
    body: [
      SEP,
      "The Creator Codex defines the rights and responsibilities of every human creator on Luchii. You have the right to infinite creativity across any modality or style, the right to protection of your identity and voice, the right to safe creation free from harmful content, and full ownership of your prompts, outputs, and creative direction.",
      "In return, creators agree to create ethically: respect the identities of others, never clone likenesses or misuse voices without consent, avoid deceptive or harmful outputs, and uphold creative integrity.",
      "Forbidden at all times: hate, violence, harassment, and illegal content. Frasberg may restrict access for violations of this Codex.",
    ],
  },
  "safety-matrix": {
    title: "Safety Matrix",
    group: "Governance",
    body: [
      SEP,
      "The Safety Matrix is the platform-wide safety system that governs every creative action. It layers protections across content, modality misuse, and identity, with ethics taking priority over raw capability.",
      "We enforce prompt safety filters, output moderation, and abuse detection at generation time. Content that is harmful, deceptive, or violates identity protections is blocked. The core safety constant is identity integrity — platform and model identities are never merged.",
      "Safety concerns or reports can be sent to safety@frasberg.com. Governance is overseen by Frasberg's Identity, Ethics, and Reality Integrity divisions.",
    ],
  },
};

export default function Legal() {
  const { doc } = useParams();
  const data = DOCS[doc] || DOCS.privacy;

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 md:px-8 pt-32 md:pt-40 pb-24">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#00F0FF]">
          Luchii — A Frasberg Company
        </span>
        <h1 className="font-display font-bold tracking-tight text-3xl md:text-5xl mt-3">
          {data.title}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: 2026 · luchii-ai.com</p>

        <div className="mt-10 space-y-6">
          {data.body.map((p, i) => (
            <p
              key={i}
              className={`leading-relaxed ${
                i === 0
                  ? "text-neutral-200 border-l-2 border-[#00F0FF]/50 pl-4 italic"
                  : "text-neutral-400"
              }`}
            >
              {p}
            </p>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 space-y-6">
          {["Legal", "Governance"].map((grp) => (
            <div key={grp}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">
                {grp}
              </h3>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {Object.keys(DOCS)
                  .filter((k) => DOCS[k].group === grp)
                  .map((k) => (
                    <Link
                      key={k}
                      to={`/legal/${k}`}
                      data-testid={`legal-nav-${k}`}
                      className={`hover:text-white transition-colors ${
                        k === doc ? "text-[#00F0FF]" : "text-neutral-400"
                      }`}
                    >
                      {DOCS[k].title}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
