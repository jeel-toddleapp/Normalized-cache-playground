const composeHocs =
  (...hocs) =>
  (Component) => {
    return hocs.reduceRight(
      (ComposedComponent, hoc) => hoc(ComposedComponent),
      Component
    );
  };

export { composeHocs };
