import type { Metadata } from 'next';
import Script from 'next/script';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Send feedback, report a bug or ask a question about Tramo.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return <div className="min-h-screen">
    <Script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} strategy="afterInteractive" />
    <Navbar />
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[800px] px-6 pb-[84px] pt-16 md:px-[72px]">
      <p className="mb-4 text-sm font-medium text-primary">Contact</p>
      <h1 className="mb-8 font-display text-[clamp(40px,5.6vw,56px)] font-medium leading-[1.1]">Get in touch.</h1>
      <p className="mb-12 text-[1.0625rem] leading-7 text-muted-foreground">Feedback, a bug, a question about your plan or anything else. We read every message and reply by email.</p>
      <ContactForm />
    </main>
    <Footer />
  </div>;
}
