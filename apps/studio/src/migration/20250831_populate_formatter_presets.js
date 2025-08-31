export default {
  name: "20250831_populate_formatter_presets",
  async run(runner) {
    const query = `
      INSERT INTO formatter_presets(name, config)
        VALUES
          ('bk-default', '{"tabWidth":2,"useTabs":false,"keywordCase":"preserve","dataTypeCase":"preserve","functionCase":"preserve","logicalOperatorNewline":"before","expressionWidth":50,"linesBetweenQueries":1,"denseOperators":false,"newlineBeforeSemicolon":false}'),
          ('pgFormatter', '{"tabWidth":4,"useTabs":false,"keywordCase":"upper","dataTypeCase":"lower","functionCase":"preserve","logicalOperatorNewline":"before","expressionWidth":50,"linesBetweenQueries":1,"denseOperators":false,"newlineBeforeSemicolon":false}'),
          ('prettier-sql', '{"tabWidth":2,"useTabs":false,"keywordCase":"upper","dataTypeCase":"lower","functionCase":"preserve","logicalOperatorNewline":"before","expressionWidth":50,"linesBetweenQueries":2,"denseOperators":false,"newlineBeforeSemicolon":false}')
    `;
    await runner.query(query);
  }
}