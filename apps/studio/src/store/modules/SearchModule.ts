import { IConnection } from "@/common/interfaces/IConnection";
import { TransportFavoriteQuery } from "@/common/transport";
import { TableOrView } from "@/lib/db/models";
import { escapeHtml } from "@/shared/lib/tabulator";
import uFuzzy from "@leeoniya/ufuzzy";
import { Module } from "vuex";
import { State as RootState } from '../index'

export interface IndexItem {
  title: string
  item: TransportFavoriteQuery | TableOrView | IConnection | string
  type: 'query' | 'table' | 'connection' | 'database'
  id: string
}

export interface SearchResult extends IndexItem {
  highlight: string
}

const uf = new uFuzzy({
  intraMode: 0,
  intraIns: Infinity,
});

function buildSearchTarget(value: string) {
  const positions: number[] = [];
  const normalized = Array.from(value).reduce((result, char, index) => {
    if (/^[\p{L}\p{N}]$/u.test(char)) {
      positions.push(index);
      return result + char.toLowerCase();
    }

    return result;
  }, "");

  return { normalized, positions };
}

function mapHighlightRanges(ranges: number[], positions: number[]) {
  const mapped: number[] = [];

  for (let i = 0; i < ranges.length; i += 2) {
    const start = ranges[i];
    const end = ranges[i + 1];

    if (start == null || end == null || start >= end) {
      continue;
    }

    const mappedStart = positions[start];
    const mappedEnd = positions[end - 1];

    if (mappedStart == null || mappedEnd == null) {
      continue;
    }

    mapped.push(mappedStart, mappedEnd + 1);
  }

  return mapped;
}

export function searchItems(
  items: IndexItem[],
  searchTerm: string,
  limit = 20
): SearchResult[] {
  const searchableItems = items.map((item) => ({
    item,
    title: item.title,
    ...buildSearchTarget(item.title),
  }));
  const normalizedSearchTerm = buildSearchTarget(searchTerm).normalized;

  if (!normalizedSearchTerm) {
    return [];
  }

  const [idxs, info, order] = uf.search(
    searchableItems.map((entry) => entry.normalized),
    normalizedSearchTerm,
    0,
    Infinity
  );

  if (!idxs || !info || !order) {
    return [];
  }

  const results: SearchResult[] = [];

  for (let i = 0; i < order.length && results.length < limit; i++) {
    const infoIdx = order[i];
    const itemIdx = idxs[infoIdx];
    const entry = searchableItems[itemIdx];

    const highlight = uFuzzy.highlight(
      entry.title,
      mapHighlightRanges(info.ranges[infoIdx], entry.positions),
      (part, matched) =>
        matched ? `<strong>${escapeHtml(part) ?? ""}</strong>` : escapeHtml(part) ?? ""
    );

    results.push({
      ...entry.item,
      highlight,
    });
  }

  return results;
}

export const SearchModule: Module<never, RootState> = {
  namespaced: true,
  getters: {
    database(_state, _getters, root: RootState): IndexItem[] {
      const tables: IndexItem[] = root.tables.map((t) => {
        const title = t.schema ? `${t.schema}.${t.name}` : t.name
        return { item: t, type: 'table', title, id: title }
      })
      const queryFolders = root['data/queryFolders']['items']
      const favorites: IndexItem[] = root['data/queries']['items'].map((f) => {
        const folder = queryFolders.find((folder) => folder.id === f.queryFolderId)
        const title = folder ? `${folder.name} > ${f.title}` : f.title
        return { item: f, type: 'query', title: title, id: `query-${f.id}` }
      })
      const connectionFolders = root['data/connectionFolders']['items']
      const connections: IndexItem[] = root['data/connections']['items'].map((f) => {
        const folder = connectionFolders.find((folder) => folder.id === f.connectionFolderId)
        const title = folder ? `${folder.name} > ${f.name}` : f.name
        return { item: f, type: 'connection', title: `connection: ${title}`, id: `connection-${f.id}`}
      })
      const databases: IndexItem[] = root.databaseList.filter(f => f !== root.database).map((f) => {
        return { item: f, type: 'database', title: `database: ${f}`, id: `database-${f}`}
      })
      return [...tables, ...favorites, ...connections, ...databases]
    },
  },
}
