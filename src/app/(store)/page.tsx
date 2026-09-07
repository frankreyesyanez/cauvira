export default function HomePage() {
  return (
    <main>
      <h1>Equipa lo que sigue.</h1>
      <form role="search">
        <label htmlFor="site-search">Buscar en Cauvira</label>
        <input id="site-search" name="q" />
        <button type="submit">Buscar</button>
      </form>
    </main>
  );
}
