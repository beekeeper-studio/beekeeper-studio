<template>
  <span class="database-icon">
    <svg
      v-if="icon && typeof icon === 'object'"
      viewBox=" 0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      :aria-label="icon.title"
    >
      <path :d="icon.path" fill="currentColor" />
    </svg>
    <span
      v-else-if="icon"
      class="devicon"
      role="img"
      :aria-label="type"
      :style="{ maskImage: `url(${icon})` }"
    />
    <i v-else class="material-icons-outlined default-icon">table_rows</i>
  </span>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import {
  siApachecassandra,
  siClickhouse,
  siCockroachlabs,
  siDuckdb,
  siGooglebigquery,
  siMariadb,
  siMongodb,
  type SimpleIcon,
  siMysql,
  siPostgresql,
  siRedis,
  siScylladb,
  siSnowflake,
  siSqlite,
  siSurrealdb,
  siTidb,
  siTrino,
} from "simple-icons";
import dynamodb from "devicon/icons/dynamodb/dynamodb-plain.svg";
import firebird from "devicon/icons/firebird/firebird-plain.svg";
import oracle from "devicon/icons/oracle/oracle-original.svg";
import sqlserver from "devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg";
import { ConnectionType } from "@/lib/db/types";

type DevIcon = string;

const icons: Record<ConnectionType, SimpleIcon | DevIcon | null> = {
  bigquery: siGooglebigquery,
  cassandra: siApachecassandra,
  clickhouse: siClickhouse,
  cockroachdb: siCockroachlabs,
  duckdb: siDuckdb,
  mariadb: siMariadb,
  mongodb: siMongodb,
  mysql: siMysql,
  postgresql: siPostgresql,
  redis: siRedis,
  scylladb: siScylladb,
  snowflake: siSnowflake,
  sqlite: siSqlite,
  surrealdb: siSurrealdb,
  tidb: siTidb,
  trino: siTrino,
  dynamodb,
  firebird,
  oracle,
  sqlserver,
  bedrock: null,
  greengage: null,
  libsql: null,
  redshift: null,
  sqlanywhere: null,
  starrocks: null,
};

export default Vue.extend({
  props: {
    type: {
      type: String as PropType<ConnectionType>,
      required: true,
    },
  },
  computed: {
    icon() {
      return icons[this.type] ?? null;
    },
  },
});
</script>

<style lang="scss" scoped>
svg,
.devicon,
i.default-icon {
  width: 1em;
  height: 1em;
}

.devicon {
  display: inline-block;
  background-color: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

i.default-icon {
  font-size: 1em;
  color: var(--text-contrast);
}
</style>
