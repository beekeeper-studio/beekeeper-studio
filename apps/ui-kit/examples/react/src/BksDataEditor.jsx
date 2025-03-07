import { useEffect, useRef } from "react";

export default function BksDataEditor({ entities }) {
  const red = useRef(null);

  function handleQuerySubmit(event) {
    alert(`Query: ${event.detail.query}`);
  }

  useEffect(() => {
    if (red.current) {
      red.current.addEventListener(
        "bks-query-submit",
        handleQuerySubmit
      );
    }
    return () => {
      if (red.current) {
        red.current.removeEventListener(
          "bks-query-submit",
          handleQuerySubmit
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!red.current) return;
    red.current.entities = entities;
  }, [entities]);

  return <bks-data-editor ref={red} />;
}
