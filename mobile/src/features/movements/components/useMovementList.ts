import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  useArchiveMovementMutation,
  useCategoriesQuery,
  useMovementsQuery,
} from "../api";
import { bogotaToday, formatCOP } from "../domain";
import type { Movement, MovementType } from "../types";
import { announce } from "../../../shared/accessibility/announcements";
export function useMovementList(initialMonth?: string, active = true) {
  const [month, setMonth] = useState(initialMonth ?? bogotaToday().slice(0, 7)),
    [type, setType] = useState<MovementType | undefined>(),
    [category, setCategory] = useState<string | undefined>(),
    [cursor, setCursor] = useState<string | undefined>(),
    [search, setSearch] = useState(""),
    [q, setQ] = useState("");
  const [pages, setPages] = useState<{
    key: string;
    cursor?: string;
    items: Movement[];
  }>({ key: "", items: [] });
  const key = `${month}|${type ?? ""}|${category ?? ""}|${q}`;
  const query = useMovementsQuery({
    month,
    type,
    category_id: category,
    cursor,
    q: q || undefined,
  });
  // Ask the server only after a short pause in typing.
  useEffect(() => {
    const next = search.trim().slice(0, 80);
    if (next === q) return;
    const timer = setTimeout(() => {
      setQ(next);
      setCursor(undefined);
      setPages({ key: "", items: [] });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, q]);
  const categories = useCategoriesQuery();
  const [archive] = useArchiveMovementMutation();
  const lock = useRef(false);
  const [archiving, setArchiving] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const reset = () => {
    setCursor(undefined);
    setPages({ key: "", items: [] });
  };
  useEffect(() => {
    if (active) {
      setCursor(undefined);
      setPages({ key: "", items: [] });
    }
  }, [active]);
  useEffect(() => {
    if (query.error) {
      setPages((old) =>
        old.key === "" && old.items.length === 0 ? old : { key: "", items: [] },
      );
      return;
    }
    if (query.currentData && !query.isFetching) {
      const fresh = query.currentData.items;
      setPages((old) => {
        const items =
          cursor && old.key === key ? [...old.items, ...fresh] : fresh;
        const unique = [
          ...new Map(items.map((item) => [item.id, item])).values(),
        ];
        if (
          old.key === key &&
          old.cursor === cursor &&
          JSON.stringify(old.items) === JSON.stringify(unique)
        )
          return old;
        return { key, cursor, items: unique };
      });
    }
  }, [query.currentData, query.isFetching, query.error, key, cursor]);
  const rows =
    query.error || !query.currentData
      ? []
      : pages.key === key
        ? pages.items
        : query.currentData.items;
  function confirmArchive(row: Movement) {
    Alert.alert(
      "Archivar movimiento",
      `¿Archivar ${formatCOP(row.amount)} del ${row.occurred_on}? No aparecerá en tus movimientos activos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          style: "destructive",
          onPress: async () => {
            if (lock.current) return;
            lock.current = true;
            setArchiving(true);
            setMessage("");
            try {
              await archive(row.id).unwrap();
              reset();
              setFailed(false);
              setMessage("Movimiento archivado");
              announce("Movimiento archivado");
            } catch {
              setFailed(true);
              setMessage(
                "No se pudo archivar. Revisa tu conexión y reintenta.",
              );
            } finally {
              lock.current = false;
              setArchiving(false);
            }
          },
        },
      ],
    );
  }
  return {
    month,
    type,
    category,
    search,
    q,
    setSearch,
    query,
    categories,
    rows,
    archiving,
    message,
    failed,
    confirmArchive,
    setMonth: (v: string) => {
      setMonth(v);
      reset();
      setMessage("");
    },
    setType: (v: MovementType | undefined) => {
      setType(v);
      setCategory(undefined);
      reset();
    },
    setCategory: (v: string | undefined) => {
      setCategory(v);
      reset();
    },
    clearFilters: () => {
      setType(undefined);
      setCategory(undefined);
      setSearch("");
      setQ("");
      reset();
    },
    loadMore: () => {
      if (query.currentData?.next_cursor && !query.isFetching)
        setCursor(query.currentData.next_cursor);
    },
    retry: () => {
      reset();
      void query.refetch();
    },
  };
}
