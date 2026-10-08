// Mock data for Luchii — replaced by backend where noted in contracts.md

export const brand = {
  name: "Luchii",
  logo: "/luchii-logo.png",
};

export const navLinks = [
  { label: "Create", href: "/create" },
  { label: "Tools", href: "#tools" },
  { label: "Models", href: "/models" },
  { label: "API", href: "/developers" },
];

export const heroPills = [
  "Build workflows",
  "Video upscaling",
  "Direct photoshoots",
  "Cast characters",
  "Stay on brand",
  "Upscale to 4K",
  "Draft storyboards",
  "Scale campaigns",
  "Generate images",
  "Shoot cinematic videos",
];

export const companies = [
  "NOVA", "OGILVE", "R/GA", "WONDER", "GUESS", "HELIOS", "VERTEX", "LUMEN",
];

export const heroImage =
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxBSSUyMGFydHxlbnwwfHx8fDE3ODYyNzY4NTJ8MA&ixlib=rb-4.1.0&q=85";

export const suiteTabs = [
  { id: "suite", label: "Creative Suite" },
  { id: "api", label: "MCP & API", badge: "New" },
  { id: "agents", label: "Agents", badge: "New" },
  { id: "plugins", label: "Plugins", badge: "New" },
  { id: "stock", label: "Stock" },
];

export const capabilities = [
  {
    id: "image",
    title: "Image",
    desc: "Generate, edit, resize, upscale. Keep characters and brand consistent across every shot.",
    img: "https://images.unsplash.com/photo-1636690581110-a512fed05fd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHw0fHxBSSUyMGFydHxlbnwwfHx8fDE3ODYyNzY4NTJ8MA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "video",
    title: "Video",
    desc: "Generate shots and full scenes. Edit with precise control. Built for cinematic work and campaigns.",
    img: "https://images.unsplash.com/photo-1769613547913-7172c7cd772c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHw0fHxmdXR1cmlzdGljJTIwY3JlYXRpdmV8ZW58MHx8fHwxNzg2Mjc2ODUyfDA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "audio",
    title: "Audio",
    desc: "Create your own voices, music, and sound effects. From dialogue to score, in your voice.",
    img: "https://images.unsplash.com/photo-1631727498498-5dd093268aea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwzfHxmdXR1cmlzdGljJTIwY3JlYXRpdmV8ZW58MHx8fHwxNzg2Mjc2ODUyfDA&ixlib=rb-4.1.0&q=85",
  },
  {
    id: "3d",
    title: "3D",
    desc: "Direct photoshoots with full control. Build 3D scenes from any image.",
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODYyNzY4NTF8MA&ixlib=rb-4.1.0&q=85",
  },
];

export const aiModels = [
  "Luchii GPT 2", "Nano Banana 2", "Grok Imagine", "Happyhorse 1", "Krea 2",
  "Veo 3", "Seedream 5", "Seedance 2", "Kling 3", "Flux 2", "ElevenLabs",
  "Runway Gen 4.5", "Wan", "Minimax",
];

export const tools = [
  { title: "AI Image Generator", desc: "Create top-quality images with the best AI models", featured: true, mode: "text" },
  { title: "Video Creator", desc: "Create videos from text, image, or both", route: "/video" },
  { title: "Image Upscaler", desc: "Upscale images up to 10K with real detail", mode: "image", preset: "Enhance and upscale this image to crisp 4K detail, preserving the original composition and colors" },
  { title: "Image Editor", desc: "Retouch, adjust, and refine photos in seconds", mode: "image" },
  { title: "Background Remover", desc: "Remove any background in one click", mode: "image", preset: "Remove the background completely and place the subject on a clean solid studio backdrop" },
  { title: "Text to Speech", desc: "Turn your text into natural speech, in any voice", route: "/tts" },
  { title: "Speech to Speech", desc: "Convert one voice into another, instantly", route: "/sts" },
  { title: "Voice Cloning", desc: "Clone your voice and speak any text with it", route: "/voice-clone" },
  { title: "Audio Studio", desc: "Generate music, sound effects, and audio beds", route: "/audio" },
  { title: "3D Studio", desc: "Generate 3D objects and assets from a prompt", route: "/3d" },
  { title: "Spaces Builder", desc: "Build interactive 3D worlds and scenes", mode: "text", preset: "Immersive explorable 3D world scene, wide establishing shot, of " },
  { title: "Change Camera Angle", desc: "Reframe any shot from a new angle", mode: "image", preset: "Reframe this shot from a new camera angle while keeping the same subject and scene" },
  { title: "All tools", desc: "Explore the full Luchii toolset", mode: "text" },
];

export const useCases = [
  { title: "Advertising", desc: "Brief to final asset. No vendor chain, no waiting. Just the work.", img: "https://images.unsplash.com/photo-1568038479111-87bf80659645?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODYyNzY4NTF8MA&ixlib=rb-4.1.0&q=85" },
  { title: "Product shots", desc: "AI-powered photoshoots. No studio. No crew. No scheduling.", img: "https://images.pexels.com/photos/29433729/pexels-photo-29433729.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
  { title: "Brand campaigns", desc: "On-brand visuals, video, and audio at any scale, any format.", img: "https://images.pexels.com/photos/15649980/pexels-photo-15649980.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
  { title: "Filmmaking", desc: "Characters, storyboards, and concepts to explore. Cinematic tools for the final frame.", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODYyNzY4NTF8MA&ixlib=rb-4.1.0&q=85" },
];

export const testimonials = [
  { quote: "Best-in-class models and workflow tools through a single unified interface. Luchii has been a key unlock as we've woven AI into our workflows, end to end.", name: "Nick Coronges", role: "CTO at R/GA" },
  { quote: "We are highly satisfied with Luchii. It consistently delivers high-quality, reliable results while streamlining workflows and enhancing efficiency.", name: "Javier Romero", role: "Global Head of Content" },
  { quote: "Luchii is a key part of our marketing stack. It helps us create high-quality content at scale as we expand our AI-native platform.", name: "Juan Urdiales", role: "Co-Founder & Co-CEO" },
];

export const pricing = [
  { name: "Starter", price: "$0", period: "/mo", desc: "For exploring what's possible.", features: ["30 credits / month", "Image generation", "Standard queue", "Community support"], cta: "Start free", highlight: false },
  { name: "Pro", price: "$39", period: "/mo", desc: "For creators shipping real work.", features: ["3,000 credits / month", "All AI models", "Priority queue", "4K upscaling", "Commercial license"], cta: "Go Pro", highlight: true },
  { name: "Business", price: "$129", period: "/mo", desc: "For teams creating at scale.", features: ["12,000 shared credits", "Unlimited users", "Collaborative Spaces", "Priority support", "Admin controls"], cta: "Start team trial", highlight: false },
];

export const faqs = [
  { q: "What is Luchii?", a: "Luchii is a full creative platform for images — generate, remix (image-to-image), and upscale, all powered by Frasberg." },
  { q: "What powers Luchii?", a: "Every Luchii tool and model is powered by Frasberg — image, video, voice, music and 3D, all in one place." },
  { q: "Who owns the content I create?", a: "You do. Everything you generate belongs to you, and it comes with a full commercial AI license." },
  { q: "Can I use Luchii for commercial work?", a: "Yes. The content you generate includes a full commercial license so you can use it in real projects." },
];

export const footerCols = [
  { title: "Product", links: ["Audio", "3D", "Spaces", "Image", "Video", "API"] },
  { title: "Tools", links: ["Image Generator", "Upscaler", "Background Remover", "Photo Editor", "Text to Speech"] },
  { title: "Company", links: ["About", "Careers", "Blog", "Originals", "Contact"] },
  { title: "Resources", links: ["Help center", "Enterprise", "Community", "Status"] },
];

export const showcase = [
  { title: "Chrome Dream", style: "3D Render", img: "https://images.unsplash.com/photo-1677080865283-26f94ed332f1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHw0fHxmdXR1cmlzdGljJTIwM0R8ZW58MHx8fHwxNzg2NDgxNjQ2fDA&ixlib=rb-4.1.0&q=85", prompt: "Liquid chrome sculpture, studio lighting, octane render, ultra detailed" },
  { title: "Stardust", style: "Cosmic", img: "https://images.unsplash.com/photo-1711560705654-325ba859c38b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHw0fHxjb3NtaWMlMjBuZWJ1bGF8ZW58MHx8fHwxNzg2NDgxNjQ2fDA&ixlib=rb-4.1.0&q=85", prompt: "Vast cosmic nebula in cyan and violet, deep-space photography" },
  { title: "Neon Muse", style: "Fashion", img: "https://images.pexels.com/photos/8107913/pexels-photo-8107913.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", prompt: "Neon-lit fashion editorial portrait, magenta and cyan rim light" },
  { title: "Golden Hour", style: "Photoreal", img: "https://images.unsplash.com/photo-1568038479111-87bf80659645?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwzfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODY0ODE2NDV8MA&ixlib=rb-4.1.0&q=85", prompt: "Cinematic portrait in warm dusk light, shallow depth of field" },
  { title: "Hyperform", style: "3D Render", img: "https://images.unsplash.com/photo-1634834300387-8015d9fb7550?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxmdXR1cmlzdGljJTIwM0R8ZW58MHx8fHwxNzg2NDgxNjQ2fDA&ixlib=rb-4.1.0&q=85", prompt: "Abstract futuristic form, glossy materials, physically based render" },
  { title: "Nebula Drift", style: "Cosmic", img: "https://images.unsplash.com/photo-1679615845580-8691c78fd7d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNzl8MHwxfHNlYXJjaHwyfHxjb3NtaWMlMjBuZWJ1bGF8ZW58MHx8fHwxNzg2NDgxNjQ2fDA&ixlib=rb-4.1.0&q=85", prompt: "Swirling nebula clouds with glowing stars, ultra high detail" },
  { title: "Lost Valley", style: "Surreal", img: "https://images.pexels.com/photos/10109585/pexels-photo-10109585.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", prompt: "Dreamlike fantasy valley at golden hour, epic scale, painterly" },
  { title: "Deep Current", style: "Abstract", img: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMDNEfGVufDB8fHx8MTc4NjQ4MTY1Mnww&ixlib=rb-4.1.0&q=85", prompt: "Organic flowing 3D shapes in deep blue and violet, octane render" },
];

export const modelFamilies = [
  {
    id: "frasberg",
    label: "Frasberg Models",
    blurb: "The flagship Frasberg family — built for cinematic realism and production-grade output.",
    models: [
      { name: "Frasberg Ex-Prime", tag: "Flagship", desc: "Our top text-to-image model with sharp detail and precise prompt control.", caps: ["Text to Image"], mode: "text", badge: "Default", img: "https://images.unsplash.com/photo-1780442491245-90152c92d84a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHw0fHxzdXJyZWFsJTIwZGlnaXRhbHxlbnwwfHx8fDE3ODY0NTA5OTZ8MA&ixlib=rb-4.1.0&q=85" },
      { name: "Frasberg Titan Core", tag: "Detail", desc: "Ultra-detailed generation with rich texture and lifelike fidelity.", caps: ["Text to Image"], mode: "text", img: "https://images.unsplash.com/photo-1776053473082-9520f829fbbb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODR8MHwxfHNlYXJjaHwxfHxzdXJyZWFsJTIwZGlnaXRhbHxlbnwwfHx8fDE3ODY0NTA5OTZ8MA&ixlib=rb-4.1.0&q=85" },
      { name: "Frasberg Apex-Sphere", tag: "Photoreal", desc: "Hyper-real portraits and product shots with natural lighting.", caps: ["Text to Image"], mode: "text", img: "https://images.pexels.com/photos/15649980/pexels-photo-15649980.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
      { name: "Frasberg Celestial Reactor", tag: "Film", desc: "Film-grade scenes with dramatic composition and color grade.", caps: ["Text to Image"], mode: "text", img: "https://images.unsplash.com/photo-1672872476232-da16b45c9001?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwyfHxjeWJlcnB1bmslMjBuZW9ufGVufDB8fHx8MTc4NjQ1MTAwMnww&ixlib=rb-4.1.0&q=85" },
      { name: "Frasberg Nebula-X", tag: "Fast", desc: "Rapid drafts and quick edits for fast iteration.", caps: ["Image to Image"], mode: "image", img: "https://images.unsplash.com/photo-1637947582297-24ccbef1bd19?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxzY2ktZmklMjBjb25jZXB0fGVufDB8fHx8MTc4NjQ1MTAwMnww&ixlib=rb-4.1.0&q=85" },
      { name: "Frasberg Astral Engine", tag: "Video", desc: "Text-to-video generation for short cinematic clips.", caps: ["Video"], route: "/video", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODYyNzY4NTF8MA&ixlib=rb-4.1.0&q=85" },
    ],
  },
  {
    id: "luchii",
    label: "Luchii Models",
    blurb: "The Luchii studio family — expressive creativity with effortless control.",
    models: [
      { name: "Luchii Nova-Muse", tag: "Creative", desc: "Top-quality, versatile generation across any subject or style.", caps: ["Text to Image"], mode: "text", img: "https://images.unsplash.com/photo-1636690581110-a512fed05fd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxBSSUyMGFydHxlbnwwfHx8fDE3ODY0NTA5OTZ8MA&ixlib=rb-4.1.0&q=85" },
      { name: "Luchii Painter-X", tag: "Editing", desc: "Remix any reference photo — restyle, reframe, and transform.", caps: ["Image to Image"], mode: "image", img: "https://images.pexels.com/photos/8108327/pexels-photo-8108327.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
      { name: "Luchii Prime", tag: "Enhance", desc: "AI enhancement re-render for crisp, high-resolution 4K detail.", caps: ["Upscale"], mode: "image", img: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwyfHwzRCUyMGFic3RyYWN0fGVufDB8fHx8MTc4NjQ1MTAwMnww&ixlib=rb-4.1.0&q=85" },
      { name: "Luchii Dreamline", tag: "Artistic", desc: "Expressive, painterly styles and bold, vivid color.", caps: ["Text to Image"], mode: "text", img: "https://images.unsplash.com/photo-1568038479111-87bf80659645?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxjaW5lbWF0aWMlMjBwb3J0cmFpdHxlbnwwfHx8fDE3ODYyNzY4NTF8MA&ixlib=rb-4.1.0&q=85" },
      { name: "Luchii Vision", tag: "Concept", desc: "Concept art and stylized worlds with striking composition.", caps: ["Text to Image"], mode: "text", img: "https://images.pexels.com/photos/29433729/pexels-photo-29433729.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" },
      { name: "Luchii Sculpt 3D", tag: "3D", desc: "Prompt-to-3D meshes you can spin, inspect and download as .glb.", caps: ["3D"], route: "/3d", img: "https://images.unsplash.com/photo-1634834300387-8015d9fb7550?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxmdXR1cmlzdGljJTIwM0R8ZW58MHx8fHwxNzg2NDgxNjQ2fDA&ixlib=rb-4.1.0&q=85" },
      { name: "Luchii Vocalist Prime", tag: "Audio", desc: "Natural text-to-speech in a range of expressive voices.", caps: ["Audio"], route: "/tts", img: "https://images.unsplash.com/photo-1631727498498-5dd093268aea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwzfHxmdXR1cmlzdGljJTIwY3JlYXRpdmV8ZW58MHx8fHwxNzg2Mjc2ODUyfDA&ixlib=rb-4.1.0&q=85" },
    ],
  },
];

// Gallery styles for the AI Image Generator tool page
export const genStyles = [
  { id: "cinematic", label: "Cinematic" },
  { id: "photorealistic", label: "Photorealistic" },
  { id: "3d", label: "3D Render" },
  { id: "anime", label: "Anime" },
  { id: "digital-art", label: "Digital Art" },
  { id: "product", label: "Product Shot" },
];

export const genAspects = [
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
  { id: "4:3", label: "4:3" },
];

export const promptSuggestions = [
  "A cinematic portrait of an astronaut in neon rain, shallow depth of field",
  "Luxury perfume bottle on wet marble, studio lighting, product photography",
  "A surreal floating island city at golden hour, ultra detailed",
  "Cyberpunk street market, volumetric fog, 35mm film look",
];
