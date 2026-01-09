import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>DCMCO - Construction Industry AI Consultancy</title>
        <meta name="description" content="DCMCO is a leading AI consultancy specializing in the construction industry" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center'
      }}>
        <main>
          <h1>DCMCO Website</h1>
          <p>A construction industry AI consultancy</p>
        </main>
      </div>
    </>
  );
}
