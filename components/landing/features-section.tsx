import Image from 'next/image';
import { ProductEditorDemo } from '@/components/landing/product-editor-demo';
import { FadeUp } from '@/components/landing/landing-motion';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    title: 'Explain how ideas relate',
    description: 'Link notes with @mentions to connect ideas as you write. Related notes appear as context, so you can explain a topic clearly with the right background.',
    color: '--landing-product-bg-1',
  },
  {
    title: 'One note, more than one trail',
    description: 'The same note can live in multiple trails. Build different explanations for different audiences, while keeping everything connected.',
    color: '--landing-product-bg-2',
  },
  {
    title: 'See the bigger picture',
    description: 'Explore how your ideas connect. The map shows notes and trails, so you can see the bigger picture and find new ways to explain a topic.',
    color: '--landing-product-bg-3',
  },
];

export function FeaturesSection() {
  return <section id="product" className="scroll-mt-20 pt-16 pb-[84px]">
    <div className="mb-10 max-w-[60ch] sm:mb-12">
      <h2 className="mb-4 max-w-[24ch] font-display text-[2.5rem] font-medium leading-[1.1] sm:text-[3rem]">Write once. Explain in different ways.</h2>
      <p className="text-[1.0625rem] leading-relaxed text-muted-foreground">Keep your notes connected and reusable. Build trails for the things you want to learn or explain.</p>
    </div>
    <div className="space-y-4">
      {STEPS.map(({ title, description, color }, index) => <FadeUp key={title}><article className={cn(
        'grid items-center gap-8 overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-8 lg:gap-12',
        index === 0 ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]' : index === 1 ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
      )}>
        <div className={cn('min-w-0 py-3 lg:py-8', index === 1 && 'lg:col-start-2 lg:row-start-1', index === 2 && 'lg:col-span-2 lg:py-0')}>
          <h3 className="mb-4 font-display text-[1.75rem] font-medium leading-tight lg:text-[2.25rem]">{title}</h3>
          <p className={cn('text-base leading-relaxed text-muted-foreground lg:text-lg', index === 2 ? 'max-w-[70ch]' : 'max-w-[40ch]')}>{description}</p>
        </div>
        <div
          className={cn(
            'relative min-w-0 overflow-hidden rounded-lg border border-border',
            index === 1 ? '-mb-5 -ml-5 max-h-[35rem] self-end rounded-l-none rounded-b-none border-l-0 border-b-0 pt-5 pr-5 sm:-mb-8 sm:-ml-8 sm:pt-8 sm:pr-8 lg:col-start-1 lg:row-start-1' : index === 2 ? '-mb-5 rounded-b-none border-b-0 px-5 pt-5 sm:-mb-8 sm:px-8 sm:pt-8 lg:col-span-2' : '-mr-5 -mb-5 max-h-[35rem] self-end rounded-r-none rounded-b-none border-r-0 border-b-0 pt-5 pl-5 sm:-mr-8 sm:-mb-8 sm:pt-8 sm:pl-8',
          )}
          style={{ background: `var(${color})` }}
        >
          {index === 2 ? <div className="relative aspect-[1802/1332] overflow-hidden rounded-t-lg dark:aspect-[1860/1298]">
            <Image src="/landing-product-map-light.png" alt="Two trails connected through the shared Memex note" fill sizes="100vw" className="object-contain dark:hidden" />
            <Image src="/landing-product-map.png" alt="Two trails connected through the shared Memex note" fill sizes="100vw" className="hidden object-contain dark:block" />
          </div> : <ProductEditorDemo variant={index === 0 ? 'connections' : 'shared'} />}
        </div>
      </article></FadeUp>)}
    </div>
  </section>;
}
