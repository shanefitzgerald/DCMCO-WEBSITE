import Head from 'next/head';
import { Button, Hero } from '@dcmco/design-system';

export default function Home() {
  const handleClick = () => {
    // eslint-disable-next-line no-console
    console.log('clicked');
  };

  return (
    <>
      <Head>
        <title>DCMCO - Construction Industry AI Consultancy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="DCMCO is a leading AI consultancy specializing in the construction industry"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Hero
        ctaButton={{
          onClick: function Ma() {},
          text: 'Get Started',
        }}
        description="Professional construction services for residential and commercial projects. We bring your vision to life with quality craftsmanship and attention to detail."
        headline="Build Your Dream Project"
      />
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          gap: '20px',
        }}
      >
        <h1>DCMCO Website shaneo was here</h1>
        <p>A construction industry AI consultancy</p>
        <Button onClick={handleClick} variant="primary">
          Click Me
        </Button>
      </div>
    </>
  );
}
