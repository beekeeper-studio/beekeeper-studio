import { searchItems, IndexItem } from "../../../src/store/modules/SearchModule"

function makeItem(title: string, type: IndexItem['type'] = 'table', opts?: { searchTitle?: string, columns?: string[] }): IndexItem {
  return {
    title,
    searchTitle: opts?.searchTitle,
    columns: opts?.columns,
    item: title,
    type,
    id: title,
  }
}

describe("searchItems", () => {
  describe("basic fuzzy search", () => {
    const items = [
      makeItem("users"),
      makeItem("orders"),
      makeItem("products"),
      makeItem("user_sessions"),
    ]

    it("returns matching items", () => {
      const results = searchItems(items, "user")
      const titles = results.map((r) => r.title)
      expect(titles).toContain("users")
      expect(titles).toContain("user_sessions")
    })

    it("returns empty array when nothing matches", () => {
      const results = searchItems(items, "zzzznothing")
      expect(results).toEqual([])
    })

    it("respects the limit parameter", () => {
      const results = searchItems(items, "u", 1)
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it("includes highlight in results", () => {
      const results = searchItems(items, "user")
      expect(results.length).toBeGreaterThan(0)
      results.forEach((r) => {
        expect(r.highlight).toBeDefined()
        expect(typeof r.highlight).toBe("string")
      })
    })
  })

  describe("searchTitle field matching", () => {
    const items = [
      makeItem("users", "table", { searchTitle: "users (id, email, name)", columns: ["id", "email", "name"] }),
      makeItem("orders", "table", { searchTitle: "orders (id, user_id, total)", columns: ["id", "user_id", "total"] }),
      makeItem("products", "table", { searchTitle: "products (id, title, price)", columns: ["id", "title", "price"] }),
    ]

    it("matches against searchTitle when provided", () => {
      const results = searchItems(items, "email")
      const titles = results.map((r) => r.title)
      expect(titles).toContain("users")
    })

    it("does not show searchTitle in display — uses title", () => {
      const results = searchItems(items, "email")
      const usersResult = results.find((r) => r.title === "users")
      expect(usersResult).toBeDefined()
      expect(usersResult.title).toBe("users")
    })

    it("field-matched results have non-highlighted display title", () => {
      const results = searchItems(items, "email")
      const usersResult = results.find((r) => r.title === "users")
      expect(usersResult).toBeDefined()
      // When matched on fields, highlight should be the escaped display title (no <strong> tags)
      expect(usersResult.highlight).not.toContain("<strong>")
    })

    it("name-matched results retain the display title", () => {
      const results = searchItems(items, "user")
      const usersResult = results.find((r) => r.title === "users")
      expect(usersResult).toBeDefined()
      // When matching on title (not searchTitle), highlight is based on the title
      expect(usersResult.highlight).toContain("user")
    })
  })

  describe("field context parenthetical", () => {
    const items = [
      makeItem("cheeses", "table", {
        searchTitle: "cheeses (id, name, origin_country_id, cheese_type, description, first_seen)",
        columns: ["id", "name", "origin_country_id", "cheese_type", "description", "first_seen"]
      }),
      makeItem("reviews", "table", {
        searchTitle: "reviews (id, cheese_id, rating, review_text)",
        columns: ["id", "cheese_id", "rating", "review_text"]
      }),
      makeItem("cheese_summary", "table", {
        searchTitle: "cheese_summary (name, average_rating, number_of_reviews)",
        columns: ["name", "average_rating", "number_of_reviews"]
      }),
      makeItem("stores", "table", {
        searchTitle: "stores (id, name, location)",
        columns: ["id", "name", "location"]
      }),
    ]

    it("shows matching field names when 1-2 match", () => {
      const results = searchItems(items, "rev")
      const reviewsResult = results.find((r) => r.title === "reviews")
      expect(reviewsResult).toBeDefined()
      expect(reviewsResult.highlight).toContain("(review_text)")
    })

    it("shows field count when 3+ fields match", () => {
      const results = searchItems(items, "s")
      const cheesesResult = results.find((r) => r.title === "cheeses")
      expect(cheesesResult).toBeDefined()
      expect(cheesesResult.highlight).toMatch(/\(\d+ fields\)/)
    })

    it("shows no parenthetical when no fields match", () => {
      const results = searchItems(items, "store")
      const storesResult = results.find((r) => r.title === "stores")
      expect(storesResult).toBeDefined()
      expect(storesResult.highlight).not.toContain("(")
    })

    it("parenthetical is italicized", () => {
      const results = searchItems(items, "rev")
      const reviewsResult = results.find((r) => r.title === "reviews")
      expect(reviewsResult.highlight).toContain("font-style: italic")
    })
  })

  describe("items without searchTitle", () => {
    const items = [
      makeItem("connection: My Database", "connection"),
      makeItem("database: production", "database"),
    ]

    it("falls back to title for searching", () => {
      const results = searchItems(items, "production")
      expect(results.length).toBe(1)
      expect(results[0].title).toBe("database: production")
    })

    it("highlights normally for non-field items", () => {
      const results = searchItems(items, "production")
      expect(results[0].highlight).toContain("<strong>")
    })
  })
})
