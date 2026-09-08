type SearchFormProps = {
  defaultQuery?: string;
  className?: string;
};

export function SearchForm({ defaultQuery = "", className }: SearchFormProps) {
  return (
    <form
      action="/productos"
      className={className ? `store-search ${className}` : "store-search"}
      method="get"
      role="search"
    >
      <label className="store-search__label" htmlFor="site-search">
        Buscar en Cauvira
      </label>
      <div className="store-search__controls">
        <input
          className="store-search__input"
          defaultValue={defaultQuery}
          id="site-search"
          name="q"
          type="search"
        />
        <button className="button button--primary" type="submit">
          Buscar
        </button>
      </div>
    </form>
  );
}
