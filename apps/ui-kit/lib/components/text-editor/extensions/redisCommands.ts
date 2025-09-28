export default {
  "acl cat": {
    "summary": "Lists the ACL categories, or the commands inside a category.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(1) since the categories and commands are a fixed set.",
    "arguments": [
      {
        "name": "category",
        "type": "string",
        "display_text": "category",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "acl deluser": {
    "summary": "Deletes ACL users, and terminates their connections.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(1) amortized time considering the typical user.",
    "arguments": [
      {
        "name": "username",
        "type": "string",
        "display_text": "username",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "acl dryrun": {
    "summary": "Simulates the execution of a command by a user, without executing the command.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(1).",
    "arguments": [
      {
        "name": "username",
        "type": "string",
        "display_text": "username"
      },
      {
        "name": "command",
        "type": "string",
        "display_text": "command"
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "acl genpass": {
    "summary": "Generates a pseudorandom, secure password that can be used to identify ACL users.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "bits",
        "type": "integer",
        "display_text": "bits",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "acl getuser": {
    "summary": "Lists the ACL rules of a user.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of password, command and pattern rules that the user has.",
    "history": {
      "6.2.0": "Added Pub/Sub channel patterns.",
      "7.0.0": "Added selectors and changed the format of key and channel patterns from a list to their rule representation."
    },
    "arguments": [
      {
        "name": "username",
        "type": "string",
        "display_text": "username"
      }
    ]
  },
  "acl help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "acl list": {
    "summary": "Dumps the effective rules in ACL file format.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of configured users."
  },
  "acl load": {
    "summary": "Reloads the rules from the configured ACL file.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of configured users."
  },
  "acl log": {
    "summary": "Lists recent security events generated due to ACL rules.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N) with N being the number of entries shown.",
    "history": {
      "7.2.0": "Added entry ID, timestamp created, and timestamp last updated."
    },
    "arguments": [
      {
        "name": "operation",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          },
          {
            "name": "reset",
            "type": "pure-token",
            "display_text": "reset",
            "token": "RESET"
          }
        ]
      }
    ]
  },
  "acl save": {
    "summary": "Saves the effective ACL rules in the configured ACL file.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of configured users."
  },
  "acl setuser": {
    "summary": "Creates and modifies an ACL user and its rules.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of rules provided.",
    "history": {
      "6.2.0": "Added Pub/Sub channel patterns.",
      "7.0.0": "Added selectors and key based permissions."
    },
    "arguments": [
      {
        "name": "username",
        "type": "string",
        "display_text": "username"
      },
      {
        "name": "rule",
        "type": "string",
        "display_text": "rule",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "acl users": {
    "summary": "Lists all ACL users.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(N). Where N is the number of configured users."
  },
  "acl whoami": {
    "summary": "Returns the authenticated username of the current connection.",
    "since": "6.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "append": {
    "summary": "Appends a string to the value of a key. Creates the key if it doesn't exist.",
    "since": "2.0.0",
    "group": "string",
    "complexity": "O(1). The amortized time complexity is O(1) assuming the appended value is small and the already present value is of any size, since the dynamic string library used by Redis will double the free space available on every reallocation.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "asking": {
    "summary": "Signals that a cluster client is following an -ASK redirect.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "auth": {
    "summary": "Authenticates the connection.",
    "since": "1.0.0",
    "group": "connection",
    "complexity": "O(N) where N is the number of passwords defined for the user",
    "history": {
      "6.0.0": "Added ACL style (username and password)."
    },
    "arguments": [
      {
        "name": "username",
        "type": "string",
        "display_text": "username",
        "since": "6.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "password",
        "type": "string",
        "display_text": "password"
      }
    ]
  },
  "bgrewriteaof": {
    "summary": "Asynchronously rewrites the append-only file to disk.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "bgsave": {
    "summary": "Asynchronously saves the database(s) to disk.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)",
    "history": {
      "3.2.2": "Added the `SCHEDULE` option."
    },
    "arguments": [
      {
        "name": "schedule",
        "type": "pure-token",
        "display_text": "schedule",
        "token": "SCHEDULE",
        "since": "3.2.2",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "bitcount": {
    "summary": "Counts the number of set bits (population counting) in a string.",
    "since": "2.6.0",
    "group": "bitmap",
    "complexity": "O(N)",
    "history": {
      "7.0.0": "Added the `BYTE|BIT` option."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "range",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "start",
            "type": "integer",
            "display_text": "start"
          },
          {
            "name": "end",
            "type": "integer",
            "display_text": "end"
          },
          {
            "name": "unit",
            "type": "oneof",
            "since": "7.0.0",
            "flags": [
              "optional"
            ],
            "arguments": [
              {
                "name": "byte",
                "type": "pure-token",
                "display_text": "byte",
                "token": "BYTE"
              },
              {
                "name": "bit",
                "type": "pure-token",
                "display_text": "bit",
                "token": "BIT"
              }
            ]
          }
        ]
      }
    ]
  },
  "bitfield": {
    "summary": "Performs arbitrary bitfield integer operations on strings.",
    "since": "3.2.0",
    "group": "bitmap",
    "complexity": "O(1) for each subcommand specified",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "operation",
        "type": "oneof",
        "flags": [
          "optional",
          "multiple"
        ],
        "arguments": [
          {
            "name": "get-block",
            "type": "block",
            "token": "GET",
            "arguments": [
              {
                "name": "encoding",
                "type": "string",
                "display_text": "encoding"
              },
              {
                "name": "offset",
                "type": "integer",
                "display_text": "offset"
              }
            ]
          },
          {
            "name": "write",
            "type": "block",
            "arguments": [
              {
                "name": "overflow-block",
                "type": "oneof",
                "token": "OVERFLOW",
                "flags": [
                  "optional"
                ],
                "arguments": [
                  [
                    "name",
                    "wrap",
                    "type",
                    "pure-token",
                    "display_text",
                    "wrap",
                    "token",
                    "WRAP"
                  ],
                  [
                    "name",
                    "sat",
                    "type",
                    "pure-token",
                    "display_text",
                    "sat",
                    "token",
                    "SAT"
                  ],
                  [
                    "name",
                    "fail",
                    "type",
                    "pure-token",
                    "display_text",
                    "fail",
                    "token",
                    "FAIL"
                  ]
                ]
              },
              {
                "name": "write-operation",
                "type": "oneof",
                "arguments": [
                  [
                    "name",
                    "set-block",
                    "type",
                    "block",
                    "token",
                    "SET",
                    "arguments",
                    [
                      [
                        "name",
                        "encoding",
                        "type",
                        "string",
                        "display_text",
                        "encoding"
                      ],
                      [
                        "name",
                        "offset",
                        "type",
                        "integer",
                        "display_text",
                        "offset"
                      ],
                      [
                        "name",
                        "value",
                        "type",
                        "integer",
                        "display_text",
                        "value"
                      ]
                    ]
                  ],
                  [
                    "name",
                    "incrby-block",
                    "type",
                    "block",
                    "token",
                    "INCRBY",
                    "arguments",
                    [
                      [
                        "name",
                        "encoding",
                        "type",
                        "string",
                        "display_text",
                        "encoding"
                      ],
                      [
                        "name",
                        "offset",
                        "type",
                        "integer",
                        "display_text",
                        "offset"
                      ],
                      [
                        "name",
                        "increment",
                        "type",
                        "integer",
                        "display_text",
                        "increment"
                      ]
                    ]
                  ]
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "bitfield_ro": {
    "summary": "Performs arbitrary read-only bitfield integer operations on strings.",
    "since": "6.0.0",
    "group": "bitmap",
    "complexity": "O(1) for each subcommand specified",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "get-block",
        "type": "block",
        "token": "GET",
        "flags": [
          "optional",
          "multiple",
          "multiple_token"
        ],
        "arguments": [
          {
            "name": "encoding",
            "type": "string",
            "display_text": "encoding"
          },
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          }
        ]
      }
    ]
  },
  "bitop": {
    "summary": "Performs bitwise operations on multiple strings, and stores the result.",
    "since": "2.6.0",
    "group": "bitmap",
    "complexity": "O(N)",
    "arguments": [
      {
        "name": "operation",
        "type": "oneof",
        "arguments": [
          {
            "name": "and",
            "type": "pure-token",
            "display_text": "and",
            "token": "AND"
          },
          {
            "name": "or",
            "type": "pure-token",
            "display_text": "or",
            "token": "OR"
          },
          {
            "name": "xor",
            "type": "pure-token",
            "display_text": "xor",
            "token": "XOR"
          },
          {
            "name": "not",
            "type": "pure-token",
            "display_text": "not",
            "token": "NOT"
          }
        ]
      },
      {
        "name": "destkey",
        "type": "key",
        "display_text": "destkey",
        "key_spec_index": 0
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "bitpos": {
    "summary": "Finds the first set (1) or clear (0) bit in a string.",
    "since": "2.8.7",
    "group": "bitmap",
    "complexity": "O(N)",
    "history": {
      "7.0.0": "Added the `BYTE|BIT` option."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "bit",
        "type": "integer",
        "display_text": "bit"
      },
      {
        "name": "range",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "start",
            "type": "integer",
            "display_text": "start"
          },
          {
            "name": "end-unit-block",
            "type": "block",
            "flags": [
              "optional"
            ],
            "arguments": [
              {
                "name": "end",
                "type": "integer",
                "display_text": "end"
              },
              {
                "name": "unit",
                "type": "oneof",
                "since": "7.0.0",
                "flags": [
                  "optional"
                ],
                "arguments": [
                  [
                    "name",
                    "byte",
                    "type",
                    "pure-token",
                    "display_text",
                    "byte",
                    "token",
                    "BYTE"
                  ],
                  [
                    "name",
                    "bit",
                    "type",
                    "pure-token",
                    "display_text",
                    "bit",
                    "token",
                    "BIT"
                  ]
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "blmove": {
    "summary": "Pops an element from a list, pushes it to another list and returns it. Blocks until an element is available otherwise. Deletes the list if the last element was moved.",
    "since": "6.2.0",
    "group": "list",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      },
      {
        "name": "wherefrom",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      },
      {
        "name": "whereto",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "blmpop": {
    "summary": "Pops the first element from one of multiple lists. Blocks until an element is available otherwise. Deletes the list if the last element was popped.",
    "since": "7.0.0",
    "group": "list",
    "complexity": "O(N+M) where N is the number of provided keys and M is the number of elements returned.",
    "arguments": [
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "where",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "blpop": {
    "summary": "Removes and returns the first element in a list. Blocks until an element is available otherwise. Deletes the list if the last element was popped.",
    "since": "2.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of provided keys.",
    "history": {
      "6.0.0": "`timeout` is interpreted as a double instead of an integer."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "brpop": {
    "summary": "Removes and returns the last element in a list. Blocks until an element is available otherwise. Deletes the list if the last element was popped.",
    "since": "2.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of provided keys.",
    "history": {
      "6.0.0": "`timeout` is interpreted as a double instead of an integer."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "brpoplpush": {
    "summary": "Pops an element from a list, pushes it to another list and returns it. Block until an element is available otherwise. Deletes the list if the last element was popped.",
    "since": "2.2.0",
    "group": "list",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`BLMOVE` with the `RIGHT` and `LEFT` arguments",
    "history": {
      "6.0.0": "`timeout` is interpreted as a double instead of an integer."
    },
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "bzmpop": {
    "summary": "Removes and returns a member by score from one or more sorted sets. Blocks until a member is available otherwise. Deletes the sorted set if the last element was popped.",
    "since": "7.0.0",
    "group": "sorted-set",
    "complexity": "O(K) + O(M*log(N)) where K is the number of provided keys, N being the number of elements in the sorted set, and M being the number of elements popped.",
    "arguments": [
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "where",
        "type": "oneof",
        "arguments": [
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "bzpopmax": {
    "summary": "Removes and returns the member with the highest score from one or more sorted sets. Blocks until a member available otherwise.  Deletes the sorted set if the last element was popped.",
    "since": "5.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)) with N being the number of elements in the sorted set.",
    "history": {
      "6.0.0": "`timeout` is interpreted as a double instead of an integer."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "bzpopmin": {
    "summary": "Removes and returns the member with the lowest score from one or more sorted sets. Blocks until a member is available otherwise. Deletes the sorted set if the last element was popped.",
    "since": "5.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)) with N being the number of elements in the sorted set.",
    "history": {
      "6.0.0": "`timeout` is interpreted as a double instead of an integer."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "timeout",
        "type": "double",
        "display_text": "timeout"
      }
    ]
  },
  "client caching": {
    "summary": "Instructs the server whether to track the keys in the next request.",
    "since": "6.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "mode",
        "type": "oneof",
        "arguments": [
          {
            "name": "yes",
            "type": "pure-token",
            "display_text": "yes",
            "token": "YES"
          },
          {
            "name": "no",
            "type": "pure-token",
            "display_text": "no",
            "token": "NO"
          }
        ]
      }
    ]
  },
  "client getname": {
    "summary": "Returns the name of the connection.",
    "since": "2.6.9",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client getredir": {
    "summary": "Returns the client ID to which the connection's tracking notifications are redirected.",
    "since": "6.0.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client id": {
    "summary": "Returns the unique client ID of the connection.",
    "since": "5.0.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client info": {
    "summary": "Returns information about the connection.",
    "since": "6.2.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client kill": {
    "summary": "Terminates open connections.",
    "since": "2.4.0",
    "group": "connection",
    "complexity": "O(N) where N is the number of client connections",
    "history": {
      "2.8.12": "`ID` option.",
      "3.2.0": "Added `master` type in for `TYPE` option.",
      "5.0.0": "Replaced `slave` `TYPE` with `replica`. `slave` still supported for backward compatibility.",
      "6.2.0": "`LADDR` option.",
      "7.4.0": "`MAXAGE` option."
    },
    "arguments": [
      {
        "name": "filter",
        "type": "oneof",
        "arguments": [
          {
            "name": "old-format",
            "type": "string",
            "display_text": "ip:port",
            "deprecated_since": "2.8.12"
          },
          {
            "name": "new-format",
            "type": "oneof",
            "flags": [
              "multiple"
            ],
            "arguments": [
              {
                "name": "client-id",
                "type": "integer",
                "display_text": "client-id",
                "token": "ID",
                "since": "2.8.12",
                "flags": [
                  "optional"
                ]
              },
              {
                "name": "client-type",
                "type": "oneof",
                "token": "TYPE",
                "since": "2.8.12",
                "flags": [
                  "optional"
                ],
                "arguments": [
                  [
                    "name",
                    "normal",
                    "type",
                    "pure-token",
                    "display_text",
                    "normal",
                    "token",
                    "NORMAL"
                  ],
                  [
                    "name",
                    "master",
                    "type",
                    "pure-token",
                    "display_text",
                    "master",
                    "token",
                    "MASTER",
                    "since",
                    "3.2.0"
                  ],
                  [
                    "name",
                    "slave",
                    "type",
                    "pure-token",
                    "display_text",
                    "slave",
                    "token",
                    "SLAVE"
                  ],
                  [
                    "name",
                    "replica",
                    "type",
                    "pure-token",
                    "display_text",
                    "replica",
                    "token",
                    "REPLICA",
                    "since",
                    "5.0.0"
                  ],
                  [
                    "name",
                    "pubsub",
                    "type",
                    "pure-token",
                    "display_text",
                    "pubsub",
                    "token",
                    "PUBSUB"
                  ]
                ]
              },
              {
                "name": "username",
                "type": "string",
                "display_text": "username",
                "token": "USER",
                "flags": [
                  "optional"
                ]
              },
              {
                "name": "addr",
                "type": "string",
                "display_text": "ip:port",
                "token": "ADDR",
                "flags": [
                  "optional"
                ]
              },
              {
                "name": "laddr",
                "type": "string",
                "display_text": "ip:port",
                "token": "LADDR",
                "since": "6.2.0",
                "flags": [
                  "optional"
                ]
              },
              {
                "name": "skipme",
                "type": "oneof",
                "token": "SKIPME",
                "flags": [
                  "optional"
                ],
                "arguments": [
                  [
                    "name",
                    "yes",
                    "type",
                    "pure-token",
                    "display_text",
                    "yes",
                    "token",
                    "YES"
                  ],
                  [
                    "name",
                    "no",
                    "type",
                    "pure-token",
                    "display_text",
                    "no",
                    "token",
                    "NO"
                  ]
                ]
              },
              {
                "name": "maxage",
                "type": "integer",
                "display_text": "maxage",
                "token": "MAXAGE",
                "since": "7.4.0",
                "flags": [
                  "optional"
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "client list": {
    "summary": "Lists open connections.",
    "since": "2.4.0",
    "group": "connection",
    "complexity": "O(N) where N is the number of client connections",
    "history": {
      "2.8.12": "Added unique client `id` field.",
      "5.0.0": "Added optional `TYPE` filter.",
      "6.0.0": "Added `user` field.",
      "6.2.0": "Added `argv-mem`, `tot-mem`, `laddr` and `redir` fields and the optional `ID` filter.",
      "7.0.0": "Added `resp`, `multi-mem`, `rbs` and `rbp` fields.",
      "7.0.3": "Added `ssub` field.",
      "7.2.0": "Added `lib-name` and `lib-ver` fields.",
      "7.4.0": "Added `watch` field.",
      "8.0.0": "Added `io-thread` field."
    },
    "arguments": [
      {
        "name": "client-type",
        "type": "oneof",
        "token": "TYPE",
        "since": "5.0.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "normal",
            "type": "pure-token",
            "display_text": "normal",
            "token": "NORMAL"
          },
          {
            "name": "master",
            "type": "pure-token",
            "display_text": "master",
            "token": "MASTER"
          },
          {
            "name": "replica",
            "type": "pure-token",
            "display_text": "replica",
            "token": "REPLICA"
          },
          {
            "name": "pubsub",
            "type": "pure-token",
            "display_text": "pubsub",
            "token": "PUBSUB"
          }
        ]
      },
      {
        "name": "client-id",
        "type": "integer",
        "display_text": "client-id",
        "token": "ID",
        "since": "6.2.0",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "client no-evict": {
    "summary": "Sets the client eviction mode of the connection.",
    "since": "7.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "enabled",
        "type": "oneof",
        "arguments": [
          {
            "name": "on",
            "type": "pure-token",
            "display_text": "on",
            "token": "ON"
          },
          {
            "name": "off",
            "type": "pure-token",
            "display_text": "off",
            "token": "OFF"
          }
        ]
      }
    ]
  },
  "client no-touch": {
    "summary": "Controls whether commands sent by the client affect the LRU/LFU of accessed keys.",
    "since": "7.2.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "enabled",
        "type": "oneof",
        "arguments": [
          {
            "name": "on",
            "type": "pure-token",
            "display_text": "on",
            "token": "ON"
          },
          {
            "name": "off",
            "type": "pure-token",
            "display_text": "off",
            "token": "OFF"
          }
        ]
      }
    ]
  },
  "client pause": {
    "summary": "Suspends commands processing.",
    "since": "3.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "history": {
      "6.2.0": "`CLIENT PAUSE WRITE` mode added along with the `mode` option."
    },
    "arguments": [
      {
        "name": "timeout",
        "type": "integer",
        "display_text": "timeout"
      },
      {
        "name": "mode",
        "type": "oneof",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "write",
            "type": "pure-token",
            "display_text": "write",
            "token": "WRITE"
          },
          {
            "name": "all",
            "type": "pure-token",
            "display_text": "all",
            "token": "ALL"
          }
        ]
      }
    ]
  },
  "client reply": {
    "summary": "Instructs the server whether to reply to commands.",
    "since": "3.2.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "action",
        "type": "oneof",
        "arguments": [
          {
            "name": "on",
            "type": "pure-token",
            "display_text": "on",
            "token": "ON"
          },
          {
            "name": "off",
            "type": "pure-token",
            "display_text": "off",
            "token": "OFF"
          },
          {
            "name": "skip",
            "type": "pure-token",
            "display_text": "skip",
            "token": "SKIP"
          }
        ]
      }
    ]
  },
  "client setinfo": {
    "summary": "Sets information specific to the client or connection.",
    "since": "7.2.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "attr",
        "type": "oneof",
        "arguments": [
          {
            "name": "libname",
            "type": "string",
            "display_text": "libname",
            "token": "LIB-NAME"
          },
          {
            "name": "libver",
            "type": "string",
            "display_text": "libver",
            "token": "LIB-VER"
          }
        ]
      }
    ]
  },
  "client setname": {
    "summary": "Sets the connection name.",
    "since": "2.6.9",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "connection-name",
        "type": "string",
        "display_text": "connection-name"
      }
    ]
  },
  "client tracking": {
    "summary": "Controls server-assisted client-side caching for the connection.",
    "since": "6.0.0",
    "group": "connection",
    "complexity": "O(1). Some options may introduce additional complexity.",
    "arguments": [
      {
        "name": "status",
        "type": "oneof",
        "arguments": [
          {
            "name": "on",
            "type": "pure-token",
            "display_text": "on",
            "token": "ON"
          },
          {
            "name": "off",
            "type": "pure-token",
            "display_text": "off",
            "token": "OFF"
          }
        ]
      },
      {
        "name": "client-id",
        "type": "integer",
        "display_text": "client-id",
        "token": "REDIRECT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "prefix",
        "type": "string",
        "display_text": "prefix",
        "token": "PREFIX",
        "flags": [
          "optional",
          "multiple",
          "multiple_token"
        ]
      },
      {
        "name": "bcast",
        "type": "pure-token",
        "display_text": "bcast",
        "token": "BCAST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "optin",
        "type": "pure-token",
        "display_text": "optin",
        "token": "OPTIN",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "optout",
        "type": "pure-token",
        "display_text": "optout",
        "token": "OPTOUT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "noloop",
        "type": "pure-token",
        "display_text": "noloop",
        "token": "NOLOOP",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "client trackinginfo": {
    "summary": "Returns information about server-assisted client-side caching for the connection.",
    "since": "6.2.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "client unblock": {
    "summary": "Unblocks a client blocked by a blocking command from a different connection.",
    "since": "5.0.0",
    "group": "connection",
    "complexity": "O(log N) where N is the number of client connections",
    "arguments": [
      {
        "name": "client-id",
        "type": "integer",
        "display_text": "client-id"
      },
      {
        "name": "unblock-type",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "timeout",
            "type": "pure-token",
            "display_text": "timeout",
            "token": "TIMEOUT"
          },
          {
            "name": "error",
            "type": "pure-token",
            "display_text": "error",
            "token": "ERROR"
          }
        ]
      }
    ]
  },
  "client unpause": {
    "summary": "Resumes processing commands from paused clients.",
    "since": "6.2.0",
    "group": "connection",
    "complexity": "O(N) Where N is the number of paused clients"
  },
  "cluster addslots": {
    "summary": "Assigns new hash slots to a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of hash slot arguments",
    "arguments": [
      {
        "name": "slot",
        "type": "integer",
        "display_text": "slot",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "cluster addslotsrange": {
    "summary": "Assigns new hash slot ranges to a node.",
    "since": "7.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of the slots between the start slot and end slot arguments.",
    "arguments": [
      {
        "name": "range",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "start-slot",
            "type": "integer",
            "display_text": "start-slot"
          },
          {
            "name": "end-slot",
            "type": "integer",
            "display_text": "end-slot"
          }
        ]
      }
    ]
  },
  "cluster bumpepoch": {
    "summary": "Advances the cluster config epoch.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster count-failure-reports": {
    "summary": "Returns the number of active failure reports active for a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of failure reports",
    "arguments": [
      {
        "name": "node-id",
        "type": "string",
        "display_text": "node-id"
      }
    ]
  },
  "cluster countkeysinslot": {
    "summary": "Returns the number of keys in a hash slot.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "slot",
        "type": "integer",
        "display_text": "slot"
      }
    ]
  },
  "cluster delslots": {
    "summary": "Sets hash slots as unbound for a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of hash slot arguments",
    "arguments": [
      {
        "name": "slot",
        "type": "integer",
        "display_text": "slot",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "cluster delslotsrange": {
    "summary": "Sets hash slot ranges as unbound for a node.",
    "since": "7.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of the slots between the start slot and end slot arguments.",
    "arguments": [
      {
        "name": "range",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "start-slot",
            "type": "integer",
            "display_text": "start-slot"
          },
          {
            "name": "end-slot",
            "type": "integer",
            "display_text": "end-slot"
          }
        ]
      }
    ]
  },
  "cluster failover": {
    "summary": "Forces a replica to perform a manual failover of its master.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "options",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "force",
            "type": "pure-token",
            "display_text": "force",
            "token": "FORCE"
          },
          {
            "name": "takeover",
            "type": "pure-token",
            "display_text": "takeover",
            "token": "TAKEOVER"
          }
        ]
      }
    ]
  },
  "cluster flushslots": {
    "summary": "Deletes all slots information from a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster forget": {
    "summary": "Removes a node from the nodes table.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "node-id",
        "type": "string",
        "display_text": "node-id"
      }
    ]
  },
  "cluster getkeysinslot": {
    "summary": "Returns the key names in a hash slot.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of requested keys",
    "arguments": [
      {
        "name": "slot",
        "type": "integer",
        "display_text": "slot"
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count"
      }
    ]
  },
  "cluster help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster info": {
    "summary": "Returns information about the state of a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster keyslot": {
    "summary": "Returns the hash slot for a key.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of bytes in the key",
    "arguments": [
      {
        "name": "key",
        "type": "string",
        "display_text": "key"
      }
    ]
  },
  "cluster links": {
    "summary": "Returns a list of all TCP links to and from peer nodes.",
    "since": "7.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of Cluster nodes"
  },
  "cluster meet": {
    "summary": "Forces a node to handshake with another node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "history": {
      "4.0.0": "Added the optional `cluster_bus_port` argument."
    },
    "arguments": [
      {
        "name": "ip",
        "type": "string",
        "display_text": "ip"
      },
      {
        "name": "port",
        "type": "integer",
        "display_text": "port"
      },
      {
        "name": "cluster-bus-port",
        "type": "integer",
        "display_text": "cluster-bus-port",
        "since": "4.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "cluster myid": {
    "summary": "Returns the ID of a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster myshardid": {
    "summary": "Returns the shard ID of a node.",
    "since": "7.2.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster nodes": {
    "summary": "Returns the cluster configuration for a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of Cluster nodes"
  },
  "cluster replicas": {
    "summary": "Lists the replica nodes of a master node.",
    "since": "5.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of replicas.",
    "arguments": [
      {
        "name": "node-id",
        "type": "string",
        "display_text": "node-id"
      }
    ]
  },
  "cluster replicate": {
    "summary": "Configure a node as replica of a master node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "node-id",
        "type": "string",
        "display_text": "node-id"
      }
    ]
  },
  "cluster reset": {
    "summary": "Resets a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of known nodes. The command may execute a FLUSHALL as a side effect.",
    "arguments": [
      {
        "name": "reset-type",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "hard",
            "type": "pure-token",
            "display_text": "hard",
            "token": "HARD"
          },
          {
            "name": "soft",
            "type": "pure-token",
            "display_text": "soft",
            "token": "SOFT"
          }
        ]
      }
    ]
  },
  "cluster saveconfig": {
    "summary": "Forces a node to save the cluster configuration to disk.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "cluster set-config-epoch": {
    "summary": "Sets the configuration epoch for a new node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "config-epoch",
        "type": "integer",
        "display_text": "config-epoch"
      }
    ]
  },
  "cluster setslot": {
    "summary": "Binds a hash slot to a node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "slot",
        "type": "integer",
        "display_text": "slot"
      },
      {
        "name": "subcommand",
        "type": "oneof",
        "arguments": [
          {
            "name": "importing",
            "type": "string",
            "display_text": "node-id",
            "token": "IMPORTING"
          },
          {
            "name": "migrating",
            "type": "string",
            "display_text": "node-id",
            "token": "MIGRATING"
          },
          {
            "name": "node",
            "type": "string",
            "display_text": "node-id",
            "token": "NODE"
          },
          {
            "name": "stable",
            "type": "pure-token",
            "display_text": "stable",
            "token": "STABLE"
          }
        ]
      }
    ]
  },
  "cluster shards": {
    "summary": "Returns the mapping of cluster slots to shards.",
    "since": "7.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of cluster nodes"
  },
  "cluster slaves": {
    "summary": "Lists the replica nodes of a master node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the number of replicas.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "5.0.0",
    "replaced_by": "`CLUSTER REPLICAS`",
    "arguments": [
      {
        "name": "node-id",
        "type": "string",
        "display_text": "node-id"
      }
    ]
  },
  "cluster slots": {
    "summary": "Returns the mapping of cluster slots to nodes.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(N) where N is the total number of Cluster nodes",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "7.0.0",
    "replaced_by": "`CLUSTER SHARDS`",
    "history": {
      "4.0.0": "Added node IDs.",
      "7.0.0": "Added additional networking metadata field."
    }
  },
  "command count": {
    "summary": "Returns a count of commands.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)"
  },
  "command docs": {
    "summary": "Returns documentary information about one, multiple or all commands.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of commands to look up",
    "arguments": [
      {
        "name": "command-name",
        "type": "string",
        "display_text": "command-name",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "command getkeys": {
    "summary": "Extracts the key names from an arbitrary command.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(N) where N is the number of arguments to the command",
    "arguments": [
      {
        "name": "command",
        "type": "string",
        "display_text": "command"
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "command getkeysandflags": {
    "summary": "Extracts the key names and access flags for an arbitrary command.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of arguments to the command",
    "arguments": [
      {
        "name": "command",
        "type": "string",
        "display_text": "command"
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "command help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "command info": {
    "summary": "Returns information about one, multiple or all commands.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(N) where N is the number of commands to look up",
    "history": {
      "7.0.0": "Allowed to be called with no argument to get info on all commands."
    },
    "arguments": [
      {
        "name": "command-name",
        "type": "string",
        "display_text": "command-name",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "command list": {
    "summary": "Returns a list of command names.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(N) where N is the total number of Redis commands",
    "arguments": [
      {
        "name": "filterby",
        "type": "oneof",
        "token": "FILTERBY",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "module-name",
            "type": "string",
            "display_text": "module-name",
            "token": "MODULE"
          },
          {
            "name": "category",
            "type": "string",
            "display_text": "category",
            "token": "ACLCAT"
          },
          {
            "name": "pattern",
            "type": "pattern",
            "display_text": "pattern",
            "token": "PATTERN"
          }
        ]
      }
    ]
  },
  "config get": {
    "summary": "Returns the effective values of configuration parameters.",
    "since": "2.0.0",
    "group": "server",
    "complexity": "O(N) when N is the number of configuration parameters provided",
    "history": {
      "7.0.0": "Added the ability to pass multiple pattern parameters in one call"
    },
    "arguments": [
      {
        "name": "parameter",
        "type": "string",
        "display_text": "parameter",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "config help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "config resetstat": {
    "summary": "Resets the server's statistics.",
    "since": "2.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "config rewrite": {
    "summary": "Persists the effective configuration to file.",
    "since": "2.8.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "config set": {
    "summary": "Sets configuration parameters in-flight.",
    "since": "2.0.0",
    "group": "server",
    "complexity": "O(N) when N is the number of configuration parameters provided",
    "history": {
      "7.0.0": "Added the ability to set multiple parameters in one call."
    },
    "arguments": [
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "parameter",
            "type": "string",
            "display_text": "parameter"
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "copy": {
    "summary": "Copies the value of a key to a new key.",
    "since": "6.2.0",
    "group": "generic",
    "complexity": "O(N) worst case for collections, where N is the number of nested items. O(1) for string values.",
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      },
      {
        "name": "destination-db",
        "type": "integer",
        "display_text": "destination-db",
        "token": "DB",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "replace",
        "type": "pure-token",
        "display_text": "replace",
        "token": "REPLACE",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "dbsize": {
    "summary": "Returns the number of keys in the database.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "debug": {
    "summary": "A container for debugging commands.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "Depends on subcommand.",
    "doc_flags": [
      "syscmd"
    ]
  },
  "decr": {
    "summary": "Decrements the integer value of a key by one. Uses 0 as initial value if the key doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "decrby": {
    "summary": "Decrements a number from the integer value of a key. Uses 0 as initial value if the key doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "decrement",
        "type": "integer",
        "display_text": "decrement"
      }
    ]
  },
  "del": {
    "summary": "Deletes one or more keys.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(N) where N is the number of keys that will be removed. When a key to remove holds a value other than a string, the individual complexity for this key is O(M) where M is the number of elements in the list, set, sorted set or hash. Removing a single key that holds a string value is O(1).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "discard": {
    "summary": "Discards a transaction.",
    "since": "2.0.0",
    "group": "transactions",
    "complexity": "O(N), when N is the number of queued commands"
  },
  "dump": {
    "summary": "Returns a serialized representation of the value stored at a key.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "O(1) to access the key and additional O(N*M) to serialize it, where N is the number of Redis objects composing the value and M their average size. For small string values the time complexity is thus O(1)+O(1*M) where M is small, so simply O(1).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "echo": {
    "summary": "Returns the given string.",
    "since": "1.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "message",
        "type": "string",
        "display_text": "message"
      }
    ]
  },
  "eval": {
    "summary": "Executes a server-side Lua script.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "Depends on the script that is executed.",
    "arguments": [
      {
        "name": "script",
        "type": "string",
        "display_text": "script"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "eval_ro": {
    "summary": "Executes a read-only server-side Lua script.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "Depends on the script that is executed.",
    "arguments": [
      {
        "name": "script",
        "type": "string",
        "display_text": "script"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "evalsha": {
    "summary": "Executes a server-side Lua script by SHA1 digest.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "Depends on the script that is executed.",
    "arguments": [
      {
        "name": "sha1",
        "type": "string",
        "display_text": "sha1"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "evalsha_ro": {
    "summary": "Executes a read-only server-side Lua script by SHA1 digest.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "Depends on the script that is executed.",
    "arguments": [
      {
        "name": "sha1",
        "type": "string",
        "display_text": "sha1"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "exec": {
    "summary": "Executes all commands in a transaction.",
    "since": "1.2.0",
    "group": "transactions",
    "complexity": "Depends on commands in the transaction"
  },
  "exists": {
    "summary": "Determines whether one or more keys exist.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(N) where N is the number of keys to check.",
    "history": {
      "3.0.3": "Accepts multiple `key` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "expire": {
    "summary": "Sets the expiration time of a key in seconds.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added options: `NX`, `XX`, `GT` and `LT`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "seconds",
        "type": "integer",
        "display_text": "seconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "7.0.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      }
    ]
  },
  "expireat": {
    "summary": "Sets the expiration time of a key to a Unix timestamp.",
    "since": "1.2.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added options: `NX`, `XX`, `GT` and `LT`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "unix-time-seconds",
        "type": "unix-time",
        "display_text": "unix-time-seconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "7.0.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      }
    ]
  },
  "expiretime": {
    "summary": "Returns the expiration time of a key as a Unix timestamp.",
    "since": "7.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "failover": {
    "summary": "Starts a coordinated failover from a server to one of its replicas.",
    "since": "6.2.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "target",
        "type": "block",
        "token": "TO",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "host",
            "type": "string",
            "display_text": "host"
          },
          {
            "name": "port",
            "type": "integer",
            "display_text": "port"
          },
          {
            "name": "force",
            "type": "pure-token",
            "display_text": "force",
            "token": "FORCE",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "abort",
        "type": "pure-token",
        "display_text": "abort",
        "token": "ABORT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds",
        "token": "TIMEOUT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "fcall": {
    "summary": "Invokes a function.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "Depends on the function that is executed.",
    "arguments": [
      {
        "name": "function",
        "type": "string",
        "display_text": "function"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "fcall_ro": {
    "summary": "Invokes a read-only function.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "Depends on the function that is executed.",
    "arguments": [
      {
        "name": "function",
        "type": "string",
        "display_text": "function"
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "flushall": {
    "summary": "Removes all keys from all databases.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(N) where N is the total number of keys in all databases",
    "history": {
      "4.0.0": "Added the `ASYNC` flushing mode modifier.",
      "6.2.0": "Added the `SYNC` flushing mode modifier."
    },
    "arguments": [
      {
        "name": "flush-type",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "async",
            "type": "pure-token",
            "display_text": "async",
            "token": "ASYNC",
            "since": "4.0.0"
          },
          {
            "name": "sync",
            "type": "pure-token",
            "display_text": "sync",
            "token": "SYNC",
            "since": "6.2.0"
          }
        ]
      }
    ]
  },
  "flushdb": {
    "summary": "Remove all keys from the current database.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of keys in the selected database",
    "history": {
      "4.0.0": "Added the `ASYNC` flushing mode modifier.",
      "6.2.0": "Added the `SYNC` flushing mode modifier."
    },
    "arguments": [
      {
        "name": "flush-type",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "async",
            "type": "pure-token",
            "display_text": "async",
            "token": "ASYNC",
            "since": "4.0.0"
          },
          {
            "name": "sync",
            "type": "pure-token",
            "display_text": "sync",
            "token": "SYNC",
            "since": "6.2.0"
          }
        ]
      }
    ]
  },
  "function delete": {
    "summary": "Deletes a library and its functions.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "library-name",
        "type": "string",
        "display_text": "library-name"
      }
    ]
  },
  "function dump": {
    "summary": "Dumps all libraries into a serialized binary payload.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(N) where N is the number of functions"
  },
  "function flush": {
    "summary": "Deletes all libraries and functions.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(N) where N is the number of functions deleted",
    "arguments": [
      {
        "name": "flush-type",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "async",
            "type": "pure-token",
            "display_text": "async",
            "token": "ASYNC"
          },
          {
            "name": "sync",
            "type": "pure-token",
            "display_text": "sync",
            "token": "SYNC"
          }
        ]
      }
    ]
  },
  "function help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(1)"
  },
  "function kill": {
    "summary": "Terminates a function during execution.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(1)"
  },
  "function list": {
    "summary": "Returns information about all libraries.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(N) where N is the number of functions",
    "arguments": [
      {
        "name": "library-name-pattern",
        "type": "string",
        "display_text": "library-name-pattern",
        "token": "LIBRARYNAME",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withcode",
        "type": "pure-token",
        "display_text": "withcode",
        "token": "WITHCODE",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "function load": {
    "summary": "Creates a library.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(1) (considering compilation time is redundant)",
    "arguments": [
      {
        "name": "replace",
        "type": "pure-token",
        "display_text": "replace",
        "token": "REPLACE",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "function-code",
        "type": "string",
        "display_text": "function-code"
      }
    ]
  },
  "function restore": {
    "summary": "Restores all libraries from a payload.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(N) where N is the number of functions on the payload",
    "arguments": [
      {
        "name": "serialized-value",
        "type": "string",
        "display_text": "serialized-value"
      },
      {
        "name": "policy",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "flush",
            "type": "pure-token",
            "display_text": "flush",
            "token": "FLUSH"
          },
          {
            "name": "append",
            "type": "pure-token",
            "display_text": "append",
            "token": "APPEND"
          },
          {
            "name": "replace",
            "type": "pure-token",
            "display_text": "replace",
            "token": "REPLACE"
          }
        ]
      }
    ]
  },
  "function stats": {
    "summary": "Returns information about a function during execution.",
    "since": "7.0.0",
    "group": "scripting",
    "complexity": "O(1)"
  },
  "geoadd": {
    "summary": "Adds one or more members to a geospatial index. The key is created if it doesn't exist.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(log(N)) for each item added, where N is the number of elements in the sorted set.",
    "history": {
      "6.2.0": "Added the `CH`, `NX` and `XX` options."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          }
        ]
      },
      {
        "name": "change",
        "type": "pure-token",
        "display_text": "change",
        "token": "CH",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "longitude",
            "type": "double",
            "display_text": "longitude"
          },
          {
            "name": "latitude",
            "type": "double",
            "display_text": "latitude"
          },
          {
            "name": "member",
            "type": "string",
            "display_text": "member"
          }
        ]
      }
    ]
  },
  "geodist": {
    "summary": "Returns the distance between two members of a geospatial index.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member1",
        "type": "string",
        "display_text": "member1"
      },
      {
        "name": "member2",
        "type": "string",
        "display_text": "member2"
      },
      {
        "name": "unit",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "m",
            "type": "pure-token",
            "display_text": "m",
            "token": "M"
          },
          {
            "name": "km",
            "type": "pure-token",
            "display_text": "km",
            "token": "KM"
          },
          {
            "name": "ft",
            "type": "pure-token",
            "display_text": "ft",
            "token": "FT"
          },
          {
            "name": "mi",
            "type": "pure-token",
            "display_text": "mi",
            "token": "MI"
          }
        ]
      }
    ]
  },
  "geohash": {
    "summary": "Returns members from a geospatial index as geohash strings.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(1) for each member requested.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "geopos": {
    "summary": "Returns the longitude and latitude of members from a geospatial index.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(1) for each member requested.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "georadius": {
    "summary": "Queries a geospatial index for members within a distance from a coordinate, optionally stores the result.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements inside the bounding box of the circular area delimited by center and radius and M is the number of items inside the index.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`GEOSEARCH` and `GEOSEARCHSTORE` with the `BYRADIUS` argument",
    "history": {
      "6.2.0": "Added the `ANY` option for `COUNT`.",
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "longitude",
        "type": "double",
        "display_text": "longitude"
      },
      {
        "name": "latitude",
        "type": "double",
        "display_text": "latitude"
      },
      {
        "name": "radius",
        "type": "double",
        "display_text": "radius"
      },
      {
        "name": "unit",
        "type": "oneof",
        "arguments": [
          {
            "name": "m",
            "type": "pure-token",
            "display_text": "m",
            "token": "M"
          },
          {
            "name": "km",
            "type": "pure-token",
            "display_text": "km",
            "token": "KM"
          },
          {
            "name": "ft",
            "type": "pure-token",
            "display_text": "ft",
            "token": "FT"
          },
          {
            "name": "mi",
            "type": "pure-token",
            "display_text": "mi",
            "token": "MI"
          }
        ]
      },
      {
        "name": "withcoord",
        "type": "pure-token",
        "display_text": "withcoord",
        "token": "WITHCOORD",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withdist",
        "type": "pure-token",
        "display_text": "withdist",
        "token": "WITHDIST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withhash",
        "type": "pure-token",
        "display_text": "withhash",
        "token": "WITHHASH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "since": "6.2.0",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "store",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "storekey",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 1,
            "token": "STORE"
          },
          {
            "name": "storedistkey",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 2,
            "token": "STOREDIST"
          }
        ]
      }
    ]
  },
  "georadius_ro": {
    "summary": "Returns members from a geospatial index that are within a distance from a coordinate.",
    "since": "3.2.10",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements inside the bounding box of the circular area delimited by center and radius and M is the number of items inside the index.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`GEOSEARCH` with the `BYRADIUS` argument",
    "history": {
      "6.2.0": "Added the `ANY` option for `COUNT`.",
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "longitude",
        "type": "double",
        "display_text": "longitude"
      },
      {
        "name": "latitude",
        "type": "double",
        "display_text": "latitude"
      },
      {
        "name": "radius",
        "type": "double",
        "display_text": "radius"
      },
      {
        "name": "unit",
        "type": "oneof",
        "arguments": [
          {
            "name": "m",
            "type": "pure-token",
            "display_text": "m",
            "token": "M"
          },
          {
            "name": "km",
            "type": "pure-token",
            "display_text": "km",
            "token": "KM"
          },
          {
            "name": "ft",
            "type": "pure-token",
            "display_text": "ft",
            "token": "FT"
          },
          {
            "name": "mi",
            "type": "pure-token",
            "display_text": "mi",
            "token": "MI"
          }
        ]
      },
      {
        "name": "withcoord",
        "type": "pure-token",
        "display_text": "withcoord",
        "token": "WITHCOORD",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withdist",
        "type": "pure-token",
        "display_text": "withdist",
        "token": "WITHDIST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withhash",
        "type": "pure-token",
        "display_text": "withhash",
        "token": "WITHHASH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "since": "6.2.0",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      }
    ]
  },
  "georadiusbymember": {
    "summary": "Queries a geospatial index for members within a distance from a member, optionally stores the result.",
    "since": "3.2.0",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements inside the bounding box of the circular area delimited by center and radius and M is the number of items inside the index.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`GEOSEARCH` and `GEOSEARCHSTORE` with the `BYRADIUS` and `FROMMEMBER` arguments",
    "history": {
      "6.2.0": "Added the `ANY` option for `COUNT`.",
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      },
      {
        "name": "radius",
        "type": "double",
        "display_text": "radius"
      },
      {
        "name": "unit",
        "type": "oneof",
        "arguments": [
          {
            "name": "m",
            "type": "pure-token",
            "display_text": "m",
            "token": "M"
          },
          {
            "name": "km",
            "type": "pure-token",
            "display_text": "km",
            "token": "KM"
          },
          {
            "name": "ft",
            "type": "pure-token",
            "display_text": "ft",
            "token": "FT"
          },
          {
            "name": "mi",
            "type": "pure-token",
            "display_text": "mi",
            "token": "MI"
          }
        ]
      },
      {
        "name": "withcoord",
        "type": "pure-token",
        "display_text": "withcoord",
        "token": "WITHCOORD",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withdist",
        "type": "pure-token",
        "display_text": "withdist",
        "token": "WITHDIST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withhash",
        "type": "pure-token",
        "display_text": "withhash",
        "token": "WITHHASH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "store",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "storekey",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 1,
            "token": "STORE"
          },
          {
            "name": "storedistkey",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 2,
            "token": "STOREDIST"
          }
        ]
      }
    ]
  },
  "georadiusbymember_ro": {
    "summary": "Returns members from a geospatial index that are within a distance from a member.",
    "since": "3.2.10",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements inside the bounding box of the circular area delimited by center and radius and M is the number of items inside the index.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`GEOSEARCH` with the `BYRADIUS` and `FROMMEMBER` arguments",
    "history": {
      "6.2.0": "Added the `ANY` option for `COUNT`.",
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      },
      {
        "name": "radius",
        "type": "double",
        "display_text": "radius"
      },
      {
        "name": "unit",
        "type": "oneof",
        "arguments": [
          {
            "name": "m",
            "type": "pure-token",
            "display_text": "m",
            "token": "M"
          },
          {
            "name": "km",
            "type": "pure-token",
            "display_text": "km",
            "token": "KM"
          },
          {
            "name": "ft",
            "type": "pure-token",
            "display_text": "ft",
            "token": "FT"
          },
          {
            "name": "mi",
            "type": "pure-token",
            "display_text": "mi",
            "token": "MI"
          }
        ]
      },
      {
        "name": "withcoord",
        "type": "pure-token",
        "display_text": "withcoord",
        "token": "WITHCOORD",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withdist",
        "type": "pure-token",
        "display_text": "withdist",
        "token": "WITHDIST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withhash",
        "type": "pure-token",
        "display_text": "withhash",
        "token": "WITHHASH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      }
    ]
  },
  "geosearch": {
    "summary": "Queries a geospatial index for members inside an area of a box or a circle.",
    "since": "6.2.0",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements in the grid-aligned bounding box area around the shape provided as the filter and M is the number of items inside the shape",
    "history": {
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "from",
        "type": "oneof",
        "arguments": [
          {
            "name": "member",
            "type": "string",
            "display_text": "member",
            "token": "FROMMEMBER"
          },
          {
            "name": "fromlonlat",
            "type": "block",
            "token": "FROMLONLAT",
            "arguments": [
              {
                "name": "longitude",
                "type": "double",
                "display_text": "longitude"
              },
              {
                "name": "latitude",
                "type": "double",
                "display_text": "latitude"
              }
            ]
          }
        ]
      },
      {
        "name": "by",
        "type": "oneof",
        "arguments": [
          {
            "name": "circle",
            "type": "block",
            "arguments": [
              {
                "name": "radius",
                "type": "double",
                "display_text": "radius",
                "token": "BYRADIUS"
              },
              {
                "name": "unit",
                "type": "oneof",
                "arguments": [
                  [
                    "name",
                    "m",
                    "type",
                    "pure-token",
                    "display_text",
                    "m",
                    "token",
                    "M"
                  ],
                  [
                    "name",
                    "km",
                    "type",
                    "pure-token",
                    "display_text",
                    "km",
                    "token",
                    "KM"
                  ],
                  [
                    "name",
                    "ft",
                    "type",
                    "pure-token",
                    "display_text",
                    "ft",
                    "token",
                    "FT"
                  ],
                  [
                    "name",
                    "mi",
                    "type",
                    "pure-token",
                    "display_text",
                    "mi",
                    "token",
                    "MI"
                  ]
                ]
              }
            ]
          },
          {
            "name": "box",
            "type": "block",
            "arguments": [
              {
                "name": "width",
                "type": "double",
                "display_text": "width",
                "token": "BYBOX"
              },
              {
                "name": "height",
                "type": "double",
                "display_text": "height"
              },
              {
                "name": "unit",
                "type": "oneof",
                "arguments": [
                  [
                    "name",
                    "m",
                    "type",
                    "pure-token",
                    "display_text",
                    "m",
                    "token",
                    "M"
                  ],
                  [
                    "name",
                    "km",
                    "type",
                    "pure-token",
                    "display_text",
                    "km",
                    "token",
                    "KM"
                  ],
                  [
                    "name",
                    "ft",
                    "type",
                    "pure-token",
                    "display_text",
                    "ft",
                    "token",
                    "FT"
                  ],
                  [
                    "name",
                    "mi",
                    "type",
                    "pure-token",
                    "display_text",
                    "mi",
                    "token",
                    "MI"
                  ]
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "withcoord",
        "type": "pure-token",
        "display_text": "withcoord",
        "token": "WITHCOORD",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withdist",
        "type": "pure-token",
        "display_text": "withdist",
        "token": "WITHDIST",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withhash",
        "type": "pure-token",
        "display_text": "withhash",
        "token": "WITHHASH",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "geosearchstore": {
    "summary": "Queries a geospatial index for members inside an area of a box or a circle, optionally stores the result.",
    "since": "6.2.0",
    "group": "geo",
    "complexity": "O(N+log(M)) where N is the number of elements in the grid-aligned bounding box area around the shape provided as the filter and M is the number of items inside the shape",
    "history": {
      "7.0.0": "Added support for uppercase unit names."
    },
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 1
      },
      {
        "name": "from",
        "type": "oneof",
        "arguments": [
          {
            "name": "member",
            "type": "string",
            "display_text": "member",
            "token": "FROMMEMBER"
          },
          {
            "name": "fromlonlat",
            "type": "block",
            "token": "FROMLONLAT",
            "arguments": [
              {
                "name": "longitude",
                "type": "double",
                "display_text": "longitude"
              },
              {
                "name": "latitude",
                "type": "double",
                "display_text": "latitude"
              }
            ]
          }
        ]
      },
      {
        "name": "by",
        "type": "oneof",
        "arguments": [
          {
            "name": "circle",
            "type": "block",
            "arguments": [
              {
                "name": "radius",
                "type": "double",
                "display_text": "radius",
                "token": "BYRADIUS"
              },
              {
                "name": "unit",
                "type": "oneof",
                "arguments": [
                  [
                    "name",
                    "m",
                    "type",
                    "pure-token",
                    "display_text",
                    "m",
                    "token",
                    "M"
                  ],
                  [
                    "name",
                    "km",
                    "type",
                    "pure-token",
                    "display_text",
                    "km",
                    "token",
                    "KM"
                  ],
                  [
                    "name",
                    "ft",
                    "type",
                    "pure-token",
                    "display_text",
                    "ft",
                    "token",
                    "FT"
                  ],
                  [
                    "name",
                    "mi",
                    "type",
                    "pure-token",
                    "display_text",
                    "mi",
                    "token",
                    "MI"
                  ]
                ]
              }
            ]
          },
          {
            "name": "box",
            "type": "block",
            "arguments": [
              {
                "name": "width",
                "type": "double",
                "display_text": "width",
                "token": "BYBOX"
              },
              {
                "name": "height",
                "type": "double",
                "display_text": "height"
              },
              {
                "name": "unit",
                "type": "oneof",
                "arguments": [
                  [
                    "name",
                    "m",
                    "type",
                    "pure-token",
                    "display_text",
                    "m",
                    "token",
                    "M"
                  ],
                  [
                    "name",
                    "km",
                    "type",
                    "pure-token",
                    "display_text",
                    "km",
                    "token",
                    "KM"
                  ],
                  [
                    "name",
                    "ft",
                    "type",
                    "pure-token",
                    "display_text",
                    "ft",
                    "token",
                    "FT"
                  ],
                  [
                    "name",
                    "mi",
                    "type",
                    "pure-token",
                    "display_text",
                    "mi",
                    "token",
                    "MI"
                  ]
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "count-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT"
          },
          {
            "name": "any",
            "type": "pure-token",
            "display_text": "any",
            "token": "ANY",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "storedist",
        "type": "pure-token",
        "display_text": "storedist",
        "token": "STOREDIST",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "get": {
    "summary": "Returns the string value of a key.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "getbit": {
    "summary": "Returns a bit value by offset.",
    "since": "2.2.0",
    "group": "bitmap",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "offset",
        "type": "integer",
        "display_text": "offset"
      }
    ]
  },
  "getdel": {
    "summary": "Returns the string value of a key after deleting the key.",
    "since": "6.2.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "getex": {
    "summary": "Returns the string value of a key after setting its expiration time.",
    "since": "6.2.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "expiration",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "seconds",
            "type": "integer",
            "display_text": "seconds",
            "token": "EX"
          },
          {
            "name": "milliseconds",
            "type": "integer",
            "display_text": "milliseconds",
            "token": "PX"
          },
          {
            "name": "unix-time-seconds",
            "type": "unix-time",
            "display_text": "unix-time-seconds",
            "token": "EXAT"
          },
          {
            "name": "unix-time-milliseconds",
            "type": "unix-time",
            "display_text": "unix-time-milliseconds",
            "token": "PXAT"
          },
          {
            "name": "persist",
            "type": "pure-token",
            "display_text": "persist",
            "token": "PERSIST"
          }
        ]
      }
    ]
  },
  "getrange": {
    "summary": "Returns a substring of the string stored at a key.",
    "since": "2.4.0",
    "group": "string",
    "complexity": "O(N) where N is the length of the returned string. The complexity is ultimately determined by the returned length, but because creating a substring from an existing string is very cheap, it can be considered O(1) for small strings.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "end",
        "type": "integer",
        "display_text": "end"
      }
    ]
  },
  "getset": {
    "summary": "Returns the previous string value of a key after setting it to a new value.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`SET` with the `!GET` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "hdel": {
    "summary": "Deletes one or more fields and their values from a hash. Deletes the hash if no fields remain.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of fields to be removed.",
    "history": {
      "2.4.0": "Accepts multiple `field` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "hello": {
    "summary": "Handshakes with the Redis server.",
    "since": "6.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "history": {
      "6.2.0": "`protover` made optional; when called without arguments the command reports the current connection's context."
    },
    "arguments": [
      {
        "name": "arguments",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "protover",
            "type": "integer",
            "display_text": "protover"
          },
          {
            "name": "auth",
            "type": "block",
            "token": "AUTH",
            "flags": [
              "optional"
            ],
            "arguments": [
              {
                "name": "username",
                "type": "string",
                "display_text": "username"
              },
              {
                "name": "password",
                "type": "string",
                "display_text": "password"
              }
            ]
          },
          {
            "name": "clientname",
            "type": "string",
            "display_text": "clientname",
            "token": "SETNAME",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "hexists": {
    "summary": "Determines whether a field exists in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      }
    ]
  },
  "hexpire": {
    "summary": "Set expiry for hash field using relative time to expire (seconds)",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "seconds",
        "type": "integer",
        "display_text": "seconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hexpireat": {
    "summary": "Set expiry for hash field using an absolute Unix timestamp (seconds)",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "unix-time-seconds",
        "type": "unix-time",
        "display_text": "unix-time-seconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hexpiretime": {
    "summary": "Returns the expiration time of a hash field as a Unix timestamp, in seconds.",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hget": {
    "summary": "Returns the value of a field in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      }
    ]
  },
  "hgetall": {
    "summary": "Returns all fields and values in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the size of the hash.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "hgetdel": {
    "summary": "Returns the value of a field and deletes it from the hash.",
    "since": "8.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hgetex": {
    "summary": "Get the value of one or more fields of a given hash key, and optionally set their expiration.",
    "since": "8.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "expiration",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "seconds",
            "type": "integer",
            "display_text": "seconds",
            "token": "EX"
          },
          {
            "name": "milliseconds",
            "type": "integer",
            "display_text": "milliseconds",
            "token": "PX"
          },
          {
            "name": "unix-time-seconds",
            "type": "unix-time",
            "display_text": "unix-time-seconds",
            "token": "EXAT"
          },
          {
            "name": "unix-time-milliseconds",
            "type": "unix-time",
            "display_text": "unix-time-milliseconds",
            "token": "PXAT"
          },
          {
            "name": "persist",
            "type": "pure-token",
            "display_text": "persist",
            "token": "PERSIST"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hincrby": {
    "summary": "Increments the integer value of a field in a hash by a number. Uses 0 as initial value if the field doesn't exist.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      },
      {
        "name": "increment",
        "type": "integer",
        "display_text": "increment"
      }
    ]
  },
  "hincrbyfloat": {
    "summary": "Increments the floating point value of a field by a number. Uses 0 as initial value if the field doesn't exist.",
    "since": "2.6.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      },
      {
        "name": "increment",
        "type": "double",
        "display_text": "increment"
      }
    ]
  },
  "hkeys": {
    "summary": "Returns all fields in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the size of the hash.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "hlen": {
    "summary": "Returns the number of fields in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "hmget": {
    "summary": "Returns the values of all fields in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of fields being requested.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "hmset": {
    "summary": "Sets the values of multiple fields.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of fields being set.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "4.0.0",
    "replaced_by": "`HSET` with multiple field-value pairs",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "field",
            "type": "string",
            "display_text": "field"
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "hpersist": {
    "summary": "Removes the expiration time for each specified field",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hpexpire": {
    "summary": "Set expiry for hash field using relative time to expire (milliseconds)",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hpexpireat": {
    "summary": "Set expiry for hash field using an absolute Unix timestamp (milliseconds)",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "unix-time-milliseconds",
        "type": "unix-time",
        "display_text": "unix-time-milliseconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hpexpiretime": {
    "summary": "Returns the expiration time of a hash field as a Unix timestamp, in msec.",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hpttl": {
    "summary": "Returns the TTL in milliseconds of a hash field.",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hrandfield": {
    "summary": "Returns one or more random fields from a hash.",
    "since": "6.2.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of fields returned",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "options",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          },
          {
            "name": "withvalues",
            "type": "pure-token",
            "display_text": "withvalues",
            "token": "WITHVALUES",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "hscan": {
    "summary": "Iterates over fields and values of a hash.",
    "since": "2.8.0",
    "group": "hash",
    "complexity": "O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return back to 0. N is the number of elements inside the collection.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "cursor",
        "type": "integer",
        "display_text": "cursor"
      },
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "token": "MATCH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "novalues",
        "type": "pure-token",
        "display_text": "novalues",
        "token": "NOVALUES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "hset": {
    "summary": "Creates or modifies the value of a field in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1) for each field/value pair added, so O(N) to add N field/value pairs when the command is called with multiple field/value pairs.",
    "history": {
      "4.0.0": "Accepts multiple `field` and `value` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "field",
            "type": "string",
            "display_text": "field"
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "hsetex": {
    "summary": "Set the value of one or more fields of a given hash key, and optionally set their expiration.",
    "since": "8.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of fields being set.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "condition",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "fnx",
            "type": "pure-token",
            "display_text": "fnx",
            "token": "FNX"
          },
          {
            "name": "fxx",
            "type": "pure-token",
            "display_text": "fxx",
            "token": "FXX"
          }
        ]
      },
      {
        "name": "expiration",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "seconds",
            "type": "integer",
            "display_text": "seconds",
            "token": "EX"
          },
          {
            "name": "milliseconds",
            "type": "integer",
            "display_text": "milliseconds",
            "token": "PX"
          },
          {
            "name": "unix-time-seconds",
            "type": "unix-time",
            "display_text": "unix-time-seconds",
            "token": "EXAT"
          },
          {
            "name": "unix-time-milliseconds",
            "type": "unix-time",
            "display_text": "unix-time-milliseconds",
            "token": "PXAT"
          },
          {
            "name": "keepttl",
            "type": "pure-token",
            "display_text": "keepttl",
            "token": "KEEPTTL"
          }
        ]
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "data",
            "type": "block",
            "flags": [
              "multiple"
            ],
            "arguments": [
              {
                "name": "field",
                "type": "string",
                "display_text": "field"
              },
              {
                "name": "value",
                "type": "string",
                "display_text": "value"
              }
            ]
          }
        ]
      }
    ]
  },
  "hsetnx": {
    "summary": "Sets the value of a field in a hash only when the field doesn't exist.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "hstrlen": {
    "summary": "Returns the length of the value of a field.",
    "since": "3.2.0",
    "group": "hash",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "field",
        "type": "string",
        "display_text": "field"
      }
    ]
  },
  "httl": {
    "summary": "Returns the TTL in seconds of a hash field.",
    "since": "7.4.0",
    "group": "hash",
    "complexity": "O(N) where N is the number of specified fields",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "fields",
        "type": "block",
        "token": "FIELDS",
        "arguments": [
          {
            "name": "numfields",
            "type": "integer",
            "display_text": "numfields"
          },
          {
            "name": "field",
            "type": "string",
            "display_text": "field",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "hvals": {
    "summary": "Returns all values in a hash.",
    "since": "2.0.0",
    "group": "hash",
    "complexity": "O(N) where N is the size of the hash.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "incr": {
    "summary": "Increments the integer value of a key by one. Uses 0 as initial value if the key doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "incrby": {
    "summary": "Increments the integer value of a key by a number. Uses 0 as initial value if the key doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "increment",
        "type": "integer",
        "display_text": "increment"
      }
    ]
  },
  "incrbyfloat": {
    "summary": "Increment the floating point value of a key by a number. Uses 0 as initial value if the key doesn't exist.",
    "since": "2.6.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "increment",
        "type": "double",
        "display_text": "increment"
      }
    ]
  },
  "info": {
    "summary": "Returns information and statistics about the server.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added support for taking multiple section arguments."
    },
    "arguments": [
      {
        "name": "section",
        "type": "string",
        "display_text": "section",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "keys": {
    "summary": "Returns all key names that match a pattern.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(N) with N being the number of keys in the database, under the assumption that the key names in the database and the given pattern have limited length.",
    "arguments": [
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern"
      }
    ]
  },
  "lastsave": {
    "summary": "Returns the Unix timestamp of the last successful save to disk.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "latency doctor": {
    "summary": "Returns a human-readable latency analysis report.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)"
  },
  "latency graph": {
    "summary": "Returns a latency graph for an event.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "event",
        "type": "string",
        "display_text": "event"
      }
    ]
  },
  "latency help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)"
  },
  "latency histogram": {
    "summary": "Returns the cumulative distribution of latencies of a subset or all commands.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of commands with latency information being retrieved.",
    "arguments": [
      {
        "name": "command",
        "type": "string",
        "display_text": "command",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "latency history": {
    "summary": "Returns timestamp-latency samples for an event.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "event",
        "type": "string",
        "display_text": "event"
      }
    ]
  },
  "latency latest": {
    "summary": "Returns the latest latency samples for all events.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)"
  },
  "latency reset": {
    "summary": "Resets the latency data for one or more events.",
    "since": "2.8.13",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "event",
        "type": "string",
        "display_text": "event",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "lcs": {
    "summary": "Finds the longest common substring.",
    "since": "7.0.0",
    "group": "string",
    "complexity": "O(N*M) where N and M are the lengths of s1 and s2, respectively",
    "arguments": [
      {
        "name": "key1",
        "type": "key",
        "display_text": "key1",
        "key_spec_index": 0
      },
      {
        "name": "key2",
        "type": "key",
        "display_text": "key2",
        "key_spec_index": 0
      },
      {
        "name": "len",
        "type": "pure-token",
        "display_text": "len",
        "token": "LEN",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "idx",
        "type": "pure-token",
        "display_text": "idx",
        "token": "IDX",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "min-match-len",
        "type": "integer",
        "display_text": "min-match-len",
        "token": "MINMATCHLEN",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "withmatchlen",
        "type": "pure-token",
        "display_text": "withmatchlen",
        "token": "WITHMATCHLEN",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "lindex": {
    "summary": "Returns an element from a list by its index.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of elements to traverse to get to the element at index. This makes asking for the first or the last element of the list O(1).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "index",
        "type": "integer",
        "display_text": "index"
      }
    ]
  },
  "linsert": {
    "summary": "Inserts an element before or after another element in a list.",
    "since": "2.2.0",
    "group": "list",
    "complexity": "O(N) where N is the number of elements to traverse before seeing the value pivot. This means that inserting somewhere on the left end on the list (head) can be considered O(1) and inserting somewhere on the right end (tail) is O(N).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "where",
        "type": "oneof",
        "arguments": [
          {
            "name": "before",
            "type": "pure-token",
            "display_text": "before",
            "token": "BEFORE"
          },
          {
            "name": "after",
            "type": "pure-token",
            "display_text": "after",
            "token": "AFTER"
          }
        ]
      },
      {
        "name": "pivot",
        "type": "string",
        "display_text": "pivot"
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element"
      }
    ]
  },
  "llen": {
    "summary": "Returns the length of a list.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "lmove": {
    "summary": "Returns an element after popping it from one list and pushing it to another. Deletes the list if the last element was moved.",
    "since": "6.2.0",
    "group": "list",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      },
      {
        "name": "wherefrom",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      },
      {
        "name": "whereto",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      }
    ]
  },
  "lmpop": {
    "summary": "Returns multiple elements from a list after removing them. Deletes the list if the last element was popped.",
    "since": "7.0.0",
    "group": "list",
    "complexity": "O(N+M) where N is the number of provided keys and M is the number of elements returned.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "where",
        "type": "oneof",
        "arguments": [
          {
            "name": "left",
            "type": "pure-token",
            "display_text": "left",
            "token": "LEFT"
          },
          {
            "name": "right",
            "type": "pure-token",
            "display_text": "right",
            "token": "RIGHT"
          }
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "lolwut": {
    "summary": "Displays computer art and the Redis version",
    "since": "5.0.0",
    "group": "server",
    "arguments": [
      {
        "name": "version",
        "type": "integer",
        "display_text": "version",
        "token": "VERSION",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "lpop": {
    "summary": "Returns the first elements in a list after removing it. Deletes the list if the last element was popped.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of elements returned",
    "history": {
      "6.2.0": "Added the `count` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "lpos": {
    "summary": "Returns the index of matching elements in a list.",
    "since": "6.0.6",
    "group": "list",
    "complexity": "O(N) where N is the number of elements in the list, for the average case. When searching for elements near the head or the tail of the list, or when the MAXLEN option is provided, the command may run in constant time.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element"
      },
      {
        "name": "rank",
        "type": "integer",
        "display_text": "rank",
        "token": "RANK",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "num-matches",
        "type": "integer",
        "display_text": "num-matches",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "len",
        "type": "integer",
        "display_text": "len",
        "token": "MAXLEN",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "lpush": {
    "summary": "Prepends one or more elements to a list. Creates the key if it doesn't exist.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(1) for each element added, so O(N) to add N elements when the command is called with multiple arguments.",
    "history": {
      "2.4.0": "Accepts multiple `element` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "lpushx": {
    "summary": "Prepends one or more elements to a list only when the list exists.",
    "since": "2.2.0",
    "group": "list",
    "complexity": "O(1) for each element added, so O(N) to add N elements when the command is called with multiple arguments.",
    "history": {
      "4.0.0": "Accepts multiple `element` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "lrange": {
    "summary": "Returns a range of elements from a list.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(S+N) where S is the distance of start offset from HEAD for small lists, from nearest end (HEAD or TAIL) for large lists; and N is the number of elements in the specified range.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "stop",
        "type": "integer",
        "display_text": "stop"
      }
    ]
  },
  "lrem": {
    "summary": "Removes elements from a list. Deletes the list if the last element was removed.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N+M) where N is the length of the list and M is the number of elements removed.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count"
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element"
      }
    ]
  },
  "lset": {
    "summary": "Sets the value of an element in a list by its index.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N) where N is the length of the list. Setting either the first or the last element of the list is O(1).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "index",
        "type": "integer",
        "display_text": "index"
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element"
      }
    ]
  },
  "ltrim": {
    "summary": "Removes elements from both ends a list. Deletes the list if all elements were trimmed.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of elements to be removed by the operation.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "stop",
        "type": "integer",
        "display_text": "stop"
      }
    ]
  },
  "memory doctor": {
    "summary": "Outputs a memory problems report.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "memory help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "memory malloc-stats": {
    "summary": "Returns the allocator statistics.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "Depends on how much memory is allocated, could be slow"
  },
  "memory purge": {
    "summary": "Asks the allocator to release memory.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "Depends on how much memory is allocated, could be slow"
  },
  "memory stats": {
    "summary": "Returns details about memory usage.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "memory usage": {
    "summary": "Estimates the memory usage of a key.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of samples.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "SAMPLES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "mget": {
    "summary": "Atomically returns the string values of one or more keys.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(N) where N is the number of keys to retrieve.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "migrate": {
    "summary": "Atomically transfers a key from one Redis instance to another.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "This command actually executes a DUMP+DEL in the source instance, and a RESTORE in the target instance. See the pages of these commands for time complexity. Also an O(N) data transfer between the two instances is performed.",
    "history": {
      "3.0.0": "Added the `COPY` and `REPLACE` options.",
      "3.0.6": "Added the `KEYS` option.",
      "4.0.7": "Added the `AUTH` option.",
      "6.0.0": "Added the `AUTH2` option."
    },
    "arguments": [
      {
        "name": "host",
        "type": "string",
        "display_text": "host"
      },
      {
        "name": "port",
        "type": "integer",
        "display_text": "port"
      },
      {
        "name": "key-selector",
        "type": "oneof",
        "arguments": [
          {
            "name": "key",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 0
          },
          {
            "name": "empty-string",
            "type": "pure-token",
            "display_text": "empty-string",
            "token": ""
          }
        ]
      },
      {
        "name": "destination-db",
        "type": "integer",
        "display_text": "destination-db"
      },
      {
        "name": "timeout",
        "type": "integer",
        "display_text": "timeout"
      },
      {
        "name": "copy",
        "type": "pure-token",
        "display_text": "copy",
        "token": "COPY",
        "since": "3.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "replace",
        "type": "pure-token",
        "display_text": "replace",
        "token": "REPLACE",
        "since": "3.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "authentication",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "auth",
            "type": "string",
            "display_text": "password",
            "token": "AUTH",
            "since": "4.0.7"
          },
          {
            "name": "auth2",
            "type": "block",
            "token": "AUTH2",
            "since": "6.0.0",
            "arguments": [
              {
                "name": "username",
                "type": "string",
                "display_text": "username"
              },
              {
                "name": "password",
                "type": "string",
                "display_text": "password"
              }
            ]
          }
        ]
      },
      {
        "name": "keys",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "token": "KEYS",
        "since": "3.0.6",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "module help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "module list": {
    "summary": "Returns all loaded modules.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(N) where N is the number of loaded modules."
  },
  "module load": {
    "summary": "Loads a module.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "path",
        "type": "string",
        "display_text": "path"
      },
      {
        "name": "arg",
        "type": "string",
        "display_text": "arg",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "module loadex": {
    "summary": "Loads a module using extended parameters.",
    "since": "7.0.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "path",
        "type": "string",
        "display_text": "path"
      },
      {
        "name": "configs",
        "type": "block",
        "token": "CONFIG",
        "flags": [
          "optional",
          "multiple",
          "multiple_token"
        ],
        "arguments": [
          {
            "name": "name",
            "type": "string",
            "display_text": "name"
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      },
      {
        "name": "args",
        "type": "string",
        "display_text": "args",
        "token": "ARGS",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "module unload": {
    "summary": "Unloads a module.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "name",
        "type": "string",
        "display_text": "name"
      }
    ]
  },
  "monitor": {
    "summary": "Listens for all requests received by the server in real-time.",
    "since": "1.0.0",
    "group": "server"
  },
  "move": {
    "summary": "Moves a key to another database.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "db",
        "type": "integer",
        "display_text": "db"
      }
    ]
  },
  "mset": {
    "summary": "Atomically creates or modifies the string values of one or more keys.",
    "since": "1.0.1",
    "group": "string",
    "complexity": "O(N) where N is the number of keys to set.",
    "arguments": [
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "key",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 0
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "msetnx": {
    "summary": "Atomically modifies the string values of one or more keys only when all keys don't exist.",
    "since": "1.0.1",
    "group": "string",
    "complexity": "O(N) where N is the number of keys to set.",
    "arguments": [
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "key",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 0
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "multi": {
    "summary": "Starts a transaction.",
    "since": "1.2.0",
    "group": "transactions",
    "complexity": "O(1)"
  },
  "object encoding": {
    "summary": "Returns the internal encoding of a Redis object.",
    "since": "2.2.3",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "object freq": {
    "summary": "Returns the logarithmic access frequency counter of a Redis object.",
    "since": "4.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "object help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "6.2.0",
    "group": "generic",
    "complexity": "O(1)"
  },
  "object idletime": {
    "summary": "Returns the time since the last access to a Redis object.",
    "since": "2.2.3",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "object refcount": {
    "summary": "Returns the reference count of a value of a key.",
    "since": "2.2.3",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "persist": {
    "summary": "Removes the expiration time of a key.",
    "since": "2.2.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "pexpire": {
    "summary": "Sets the expiration time of a key in milliseconds.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added options: `NX`, `XX`, `GT` and `LT`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "7.0.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      }
    ]
  },
  "pexpireat": {
    "summary": "Sets the expiration time of a key to a Unix milliseconds timestamp.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added options: `NX`, `XX`, `GT` and `LT`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "unix-time-milliseconds",
        "type": "unix-time",
        "display_text": "unix-time-milliseconds"
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "7.0.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          },
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      }
    ]
  },
  "pexpiretime": {
    "summary": "Returns the expiration time of a key as a Unix milliseconds timestamp.",
    "since": "7.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "pfadd": {
    "summary": "Adds elements to a HyperLogLog key. Creates the key if it doesn't exist.",
    "since": "2.8.9",
    "group": "hyperloglog",
    "complexity": "O(1) to add every element.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "pfcount": {
    "summary": "Returns the approximated cardinality of the set(s) observed by the HyperLogLog key(s).",
    "since": "2.8.9",
    "group": "hyperloglog",
    "complexity": "O(1) with a very small average constant time when called with a single key. O(N) with N being the number of keys, and much bigger constant times, when called with multiple keys.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "pfdebug": {
    "summary": "Internal commands for debugging HyperLogLog values.",
    "since": "2.8.9",
    "group": "hyperloglog",
    "complexity": "N/A",
    "doc_flags": [
      "syscmd"
    ],
    "arguments": [
      {
        "name": "subcommand",
        "type": "string",
        "display_text": "subcommand"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "pfmerge": {
    "summary": "Merges one or more HyperLogLog values into a single key.",
    "since": "2.8.9",
    "group": "hyperloglog",
    "complexity": "O(N) to merge N HyperLogLogs, but with high constant times.",
    "arguments": [
      {
        "name": "destkey",
        "type": "key",
        "display_text": "destkey",
        "key_spec_index": 0
      },
      {
        "name": "sourcekey",
        "type": "key",
        "display_text": "sourcekey",
        "key_spec_index": 1,
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "pfselftest": {
    "summary": "An internal command for testing HyperLogLog values.",
    "since": "2.8.9",
    "group": "hyperloglog",
    "complexity": "N/A",
    "doc_flags": [
      "syscmd"
    ]
  },
  "ping": {
    "summary": "Returns the server's liveliness response.",
    "since": "1.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "message",
        "type": "string",
        "display_text": "message",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "psetex": {
    "summary": "Sets both string value and expiration time in milliseconds of a key. The key is created if it doesn't exist.",
    "since": "2.6.0",
    "group": "string",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "2.6.12",
    "replaced_by": "`SET` with the `PX` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds"
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "psubscribe": {
    "summary": "Listens for messages published to channels that match one or more patterns.",
    "since": "2.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of patterns to subscribe to.",
    "arguments": [
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "psync": {
    "summary": "An internal command used in replication.",
    "since": "2.8.0",
    "group": "server",
    "arguments": [
      {
        "name": "replicationid",
        "type": "string",
        "display_text": "replicationid"
      },
      {
        "name": "offset",
        "type": "integer",
        "display_text": "offset"
      }
    ]
  },
  "pttl": {
    "summary": "Returns the expiration time in milliseconds of a key.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "2.8.0": "Added the -2 reply."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "publish": {
    "summary": "Posts a message to a channel.",
    "since": "2.0.0",
    "group": "pubsub",
    "complexity": "O(N+M) where N is the number of clients subscribed to the receiving channel and M is the total number of subscribed patterns (by any client).",
    "arguments": [
      {
        "name": "channel",
        "type": "string",
        "display_text": "channel"
      },
      {
        "name": "message",
        "type": "string",
        "display_text": "message"
      }
    ]
  },
  "pubsub channels": {
    "summary": "Returns the active channels.",
    "since": "2.8.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of active channels, and assuming constant time pattern matching (relatively short channels and patterns)",
    "arguments": [
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "pubsub help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "6.2.0",
    "group": "pubsub",
    "complexity": "O(1)"
  },
  "pubsub numpat": {
    "summary": "Returns a count of unique pattern subscriptions.",
    "since": "2.8.0",
    "group": "pubsub",
    "complexity": "O(1)"
  },
  "pubsub numsub": {
    "summary": "Returns a count of subscribers to channels.",
    "since": "2.8.0",
    "group": "pubsub",
    "complexity": "O(N) for the NUMSUB subcommand, where N is the number of requested channels",
    "arguments": [
      {
        "name": "channel",
        "type": "string",
        "display_text": "channel",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "pubsub shardchannels": {
    "summary": "Returns the active shard channels.",
    "since": "7.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of active shard channels, and assuming constant time pattern matching (relatively short shard channels).",
    "arguments": [
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "pubsub shardnumsub": {
    "summary": "Returns the count of subscribers of shard channels.",
    "since": "7.0.0",
    "group": "pubsub",
    "complexity": "O(N) for the SHARDNUMSUB subcommand, where N is the number of requested shard channels",
    "arguments": [
      {
        "name": "shardchannel",
        "type": "string",
        "display_text": "shardchannel",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "punsubscribe": {
    "summary": "Stops listening to messages published to channels that match one or more patterns.",
    "since": "2.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of patterns to unsubscribe.",
    "arguments": [
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "quit": {
    "summary": "Closes the connection.",
    "since": "1.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "7.2.0",
    "replaced_by": "just closing the connection"
  },
  "randomkey": {
    "summary": "Returns a random key name from the database.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)"
  },
  "readonly": {
    "summary": "Enables read-only queries for a connection to a Redis Cluster replica node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "readwrite": {
    "summary": "Enables read-write queries for a connection to a Reids Cluster replica node.",
    "since": "3.0.0",
    "group": "cluster",
    "complexity": "O(1)"
  },
  "rename": {
    "summary": "Renames a key and overwrites the destination.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "newkey",
        "type": "key",
        "display_text": "newkey",
        "key_spec_index": 1
      }
    ]
  },
  "renamenx": {
    "summary": "Renames a key only when the target key name doesn't exist.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "3.2.0": "The command no longer returns an error when source and destination names are the same."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "newkey",
        "type": "key",
        "display_text": "newkey",
        "key_spec_index": 1
      }
    ]
  },
  "replconf": {
    "summary": "An internal command for configuring the replication stream.",
    "since": "3.0.0",
    "group": "server",
    "complexity": "O(1)",
    "doc_flags": [
      "syscmd"
    ]
  },
  "replicaof": {
    "summary": "Configures a server as replica of another, or promotes it to a master.",
    "since": "5.0.0",
    "group": "server",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "args",
        "type": "oneof",
        "arguments": [
          {
            "name": "host-port",
            "type": "block",
            "arguments": [
              {
                "name": "host",
                "type": "string",
                "display_text": "host"
              },
              {
                "name": "port",
                "type": "integer",
                "display_text": "port"
              }
            ]
          },
          {
            "name": "no-one",
            "type": "block",
            "arguments": [
              {
                "name": "no",
                "type": "pure-token",
                "display_text": "no",
                "token": "NO"
              },
              {
                "name": "one",
                "type": "pure-token",
                "display_text": "one",
                "token": "ONE"
              }
            ]
          }
        ]
      }
    ]
  },
  "reset": {
    "summary": "Resets the connection.",
    "since": "6.2.0",
    "group": "connection",
    "complexity": "O(1)"
  },
  "restore": {
    "summary": "Creates a key from the serialized representation of a value.",
    "since": "2.6.0",
    "group": "generic",
    "complexity": "O(1) to create the new key and additional O(N*M) to reconstruct the serialized value, where N is the number of Redis objects composing the value and M their average size. For small string values the time complexity is thus O(1)+O(1*M) where M is small, so simply O(1). However for sorted set values the complexity is O(N*M*log(N)) because inserting values into sorted sets is O(log(N)).",
    "history": {
      "3.0.0": "Added the `REPLACE` modifier.",
      "5.0.0": "Added the `IDLETIME` and `FREQ` options."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "ttl",
        "type": "integer",
        "display_text": "ttl"
      },
      {
        "name": "serialized-value",
        "type": "string",
        "display_text": "serialized-value"
      },
      {
        "name": "replace",
        "type": "pure-token",
        "display_text": "replace",
        "token": "REPLACE",
        "since": "3.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "absttl",
        "type": "pure-token",
        "display_text": "absttl",
        "token": "ABSTTL",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "seconds",
        "type": "integer",
        "display_text": "seconds",
        "token": "IDLETIME",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "frequency",
        "type": "integer",
        "display_text": "frequency",
        "token": "FREQ",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "restore-asking": {
    "summary": "An internal command for migrating keys in a cluster.",
    "since": "3.0.0",
    "group": "server",
    "complexity": "O(1) to create the new key and additional O(N*M) to reconstruct the serialized value, where N is the number of Redis objects composing the value and M their average size. For small string values the time complexity is thus O(1)+O(1*M) where M is small, so simply O(1). However for sorted set values the complexity is O(N*M*log(N)) because inserting values into sorted sets is O(log(N)).",
    "doc_flags": [
      "syscmd"
    ],
    "history": {
      "3.0.0": "Added the `REPLACE` modifier.",
      "5.0.0": "Added the `IDLETIME` and `FREQ` options."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "ttl",
        "type": "integer",
        "display_text": "ttl"
      },
      {
        "name": "serialized-value",
        "type": "string",
        "display_text": "serialized-value"
      },
      {
        "name": "replace",
        "type": "pure-token",
        "display_text": "replace",
        "token": "REPLACE",
        "since": "3.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "absttl",
        "type": "pure-token",
        "display_text": "absttl",
        "token": "ABSTTL",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "seconds",
        "type": "integer",
        "display_text": "seconds",
        "token": "IDLETIME",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "frequency",
        "type": "integer",
        "display_text": "frequency",
        "token": "FREQ",
        "since": "5.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "role": {
    "summary": "Returns the replication role.",
    "since": "2.8.12",
    "group": "server",
    "complexity": "O(1)"
  },
  "rpop": {
    "summary": "Returns and removes the last elements of a list. Deletes the list if the last element was popped.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(N) where N is the number of elements returned",
    "history": {
      "6.2.0": "Added the `count` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "rpoplpush": {
    "summary": "Returns the last element of a list after removing and pushing it to another list. Deletes the list if the last element was popped.",
    "since": "1.2.0",
    "group": "list",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`LMOVE` with the `RIGHT` and `LEFT` arguments",
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      }
    ]
  },
  "rpush": {
    "summary": "Appends one or more elements to a list. Creates the key if it doesn't exist.",
    "since": "1.0.0",
    "group": "list",
    "complexity": "O(1) for each element added, so O(N) to add N elements when the command is called with multiple arguments.",
    "history": {
      "2.4.0": "Accepts multiple `element` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "rpushx": {
    "summary": "Appends an element to a list only when the list exists.",
    "since": "2.2.0",
    "group": "list",
    "complexity": "O(1) for each element added, so O(N) to add N elements when the command is called with multiple arguments.",
    "history": {
      "4.0.0": "Accepts multiple `element` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "element",
        "type": "string",
        "display_text": "element",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sadd": {
    "summary": "Adds one or more members to a set. Creates the key if it doesn't exist.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(1) for each element added, so O(N) to add N elements when the command is called with multiple arguments.",
    "history": {
      "2.4.0": "Accepts multiple `member` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "save": {
    "summary": "Synchronously saves the database(s) to disk.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(N) where N is the total number of keys in all databases"
  },
  "scan": {
    "summary": "Iterates over the key names in the database.",
    "since": "2.8.0",
    "group": "generic",
    "complexity": "O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return back to 0. N is the number of elements inside the collection.",
    "history": {
      "6.0.0": "Added the `TYPE` subcommand."
    },
    "arguments": [
      {
        "name": "cursor",
        "type": "integer",
        "display_text": "cursor"
      },
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "token": "MATCH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "type",
        "type": "string",
        "display_text": "type",
        "token": "TYPE",
        "since": "6.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "scard": {
    "summary": "Returns the number of members in a set.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "script debug": {
    "summary": "Sets the debug mode of server-side Lua scripts.",
    "since": "3.2.0",
    "group": "scripting",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "mode",
        "type": "oneof",
        "arguments": [
          {
            "name": "yes",
            "type": "pure-token",
            "display_text": "yes",
            "token": "YES"
          },
          {
            "name": "sync",
            "type": "pure-token",
            "display_text": "sync",
            "token": "SYNC"
          },
          {
            "name": "no",
            "type": "pure-token",
            "display_text": "no",
            "token": "NO"
          }
        ]
      }
    ]
  },
  "script exists": {
    "summary": "Determines whether server-side Lua scripts exist in the script cache.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "O(N) with N being the number of scripts to check (so checking a single script is an O(1) operation).",
    "arguments": [
      {
        "name": "sha1",
        "type": "string",
        "display_text": "sha1",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "script flush": {
    "summary": "Removes all server-side Lua scripts from the script cache.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "O(N) with N being the number of scripts in cache",
    "history": {
      "6.2.0": "Added the `ASYNC` and `SYNC` flushing mode modifiers."
    },
    "arguments": [
      {
        "name": "flush-type",
        "type": "oneof",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "async",
            "type": "pure-token",
            "display_text": "async",
            "token": "ASYNC"
          },
          {
            "name": "sync",
            "type": "pure-token",
            "display_text": "sync",
            "token": "SYNC"
          }
        ]
      }
    ]
  },
  "script help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "scripting",
    "complexity": "O(1)"
  },
  "script kill": {
    "summary": "Terminates a server-side Lua script during execution.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "O(1)"
  },
  "script load": {
    "summary": "Loads a server-side Lua script to the script cache.",
    "since": "2.6.0",
    "group": "scripting",
    "complexity": "O(N) with N being the length in bytes of the script body.",
    "arguments": [
      {
        "name": "script",
        "type": "string",
        "display_text": "script"
      }
    ]
  },
  "sdiff": {
    "summary": "Returns the difference of multiple sets.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the total number of elements in all given sets.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sdiffstore": {
    "summary": "Stores the difference of multiple sets in a key.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the total number of elements in all given sets.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "select": {
    "summary": "Changes the selected database.",
    "since": "1.0.0",
    "group": "connection",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "index",
        "type": "integer",
        "display_text": "index"
      }
    ]
  },
  "set": {
    "summary": "Sets the string value of a key, ignoring its type. The key is created if it doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "history": {
      "2.6.12": "Added the `EX`, `PX`, `NX` and `XX` options.",
      "6.0.0": "Added the `KEEPTTL` option.",
      "6.2.0": "Added the `GET`, `EXAT` and `PXAT` option.",
      "7.0.0": "Allowed the `NX` and `GET` options to be used together."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "2.6.12",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          }
        ]
      },
      {
        "name": "get",
        "type": "pure-token",
        "display_text": "get",
        "token": "GET",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "expiration",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "seconds",
            "type": "integer",
            "display_text": "seconds",
            "token": "EX",
            "since": "2.6.12"
          },
          {
            "name": "milliseconds",
            "type": "integer",
            "display_text": "milliseconds",
            "token": "PX",
            "since": "2.6.12"
          },
          {
            "name": "unix-time-seconds",
            "type": "unix-time",
            "display_text": "unix-time-seconds",
            "token": "EXAT",
            "since": "6.2.0"
          },
          {
            "name": "unix-time-milliseconds",
            "type": "unix-time",
            "display_text": "unix-time-milliseconds",
            "token": "PXAT",
            "since": "6.2.0"
          },
          {
            "name": "keepttl",
            "type": "pure-token",
            "display_text": "keepttl",
            "token": "KEEPTTL",
            "since": "6.0.0"
          }
        ]
      }
    ]
  },
  "setbit": {
    "summary": "Sets or clears the bit at offset of the string value. Creates the key if it doesn't exist.",
    "since": "2.2.0",
    "group": "bitmap",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "offset",
        "type": "integer",
        "display_text": "offset"
      },
      {
        "name": "value",
        "type": "integer",
        "display_text": "value"
      }
    ]
  },
  "setex": {
    "summary": "Sets the string value and expiration time of a key. Creates the key if it doesn't exist.",
    "since": "2.0.0",
    "group": "string",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "2.6.12",
    "replaced_by": "`SET` with the `EX` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "seconds",
        "type": "integer",
        "display_text": "seconds"
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "setnx": {
    "summary": "Set the string value of a key only when the key doesn't exist.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "2.6.12",
    "replaced_by": "`SET` with the `NX` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "setrange": {
    "summary": "Overwrites a part of a string value with another by an offset. Creates the key if it doesn't exist.",
    "since": "2.2.0",
    "group": "string",
    "complexity": "O(1), not counting the time taken to copy the new string in place. Usually, this string is very small so the amortized complexity is O(1). Otherwise, complexity is O(M) with M being the length of the value argument.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "offset",
        "type": "integer",
        "display_text": "offset"
      },
      {
        "name": "value",
        "type": "string",
        "display_text": "value"
      }
    ]
  },
  "shutdown": {
    "summary": "Synchronously saves the database(s) to disk and shuts down the Redis server.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(N) when saving, where N is the total number of keys in all databases when saving data, otherwise O(1)",
    "history": {
      "7.0.0": "Added the `NOW`, `FORCE` and `ABORT` modifiers."
    },
    "arguments": [
      {
        "name": "save-selector",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nosave",
            "type": "pure-token",
            "display_text": "nosave",
            "token": "NOSAVE"
          },
          {
            "name": "save",
            "type": "pure-token",
            "display_text": "save",
            "token": "SAVE"
          }
        ]
      },
      {
        "name": "now",
        "type": "pure-token",
        "display_text": "now",
        "token": "NOW",
        "since": "7.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "force",
        "type": "pure-token",
        "display_text": "force",
        "token": "FORCE",
        "since": "7.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "abort",
        "type": "pure-token",
        "display_text": "abort",
        "token": "ABORT",
        "since": "7.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "sinter": {
    "summary": "Returns the intersect of multiple sets.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N*M) worst case where N is the cardinality of the smallest set and M is the number of sets.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sintercard": {
    "summary": "Returns the number of members of the intersect of multiple sets.",
    "since": "7.0.0",
    "group": "set",
    "complexity": "O(N*M) worst case where N is the cardinality of the smallest set and M is the number of sets.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "limit",
        "type": "integer",
        "display_text": "limit",
        "token": "LIMIT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "sinterstore": {
    "summary": "Stores the intersect of multiple sets in a key.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N*M) worst case where N is the cardinality of the smallest set and M is the number of sets.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sismember": {
    "summary": "Determines whether a member belongs to a set.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      }
    ]
  },
  "slaveof": {
    "summary": "Sets a Redis server as a replica of another, or promotes it to being a master.",
    "since": "1.0.0",
    "group": "server",
    "complexity": "O(1)",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "5.0.0",
    "replaced_by": "`REPLICAOF`",
    "arguments": [
      {
        "name": "args",
        "type": "oneof",
        "arguments": [
          {
            "name": "host-port",
            "type": "block",
            "arguments": [
              {
                "name": "host",
                "type": "string",
                "display_text": "host"
              },
              {
                "name": "port",
                "type": "integer",
                "display_text": "port"
              }
            ]
          },
          {
            "name": "no-one",
            "type": "block",
            "arguments": [
              {
                "name": "no",
                "type": "pure-token",
                "display_text": "no",
                "token": "NO"
              },
              {
                "name": "one",
                "type": "pure-token",
                "display_text": "one",
                "token": "ONE"
              }
            ]
          }
        ]
      }
    ]
  },
  "slowlog get": {
    "summary": "Returns the slow log's entries.",
    "since": "2.2.12",
    "group": "server",
    "complexity": "O(N) where N is the number of entries returned",
    "history": {
      "4.0.0": "Added client IP address, port and name to the reply."
    },
    "arguments": [
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "slowlog help": {
    "summary": "Show helpful text about the different subcommands",
    "since": "6.2.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "slowlog len": {
    "summary": "Returns the number of entries in the slow log.",
    "since": "2.2.12",
    "group": "server",
    "complexity": "O(1)"
  },
  "slowlog reset": {
    "summary": "Clears all entries from the slow log.",
    "since": "2.2.12",
    "group": "server",
    "complexity": "O(N) where N is the number of entries in the slowlog"
  },
  "smembers": {
    "summary": "Returns all members of a set.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the set cardinality.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "smismember": {
    "summary": "Determines whether multiple members belong to a set.",
    "since": "6.2.0",
    "group": "set",
    "complexity": "O(N) where N is the number of elements being checked for membership",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "smove": {
    "summary": "Moves a member from one set to another.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "source",
        "type": "key",
        "display_text": "source",
        "key_spec_index": 0
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 1
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      }
    ]
  },
  "sort": {
    "summary": "Sorts the elements in a list, a set, or a sorted set, optionally storing the result.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(N+M*log(M)) where N is the number of elements in the list or set to sort, and M the number of returned elements. When the elements are not sorted, complexity is O(N).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "by-pattern",
        "type": "pattern",
        "display_text": "pattern",
        "key_spec_index": 1,
        "token": "BY",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      },
      {
        "name": "get-pattern",
        "type": "pattern",
        "display_text": "pattern",
        "key_spec_index": 1,
        "token": "GET",
        "flags": [
          "optional",
          "multiple",
          "multiple_token"
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "sorting",
        "type": "pure-token",
        "display_text": "sorting",
        "token": "ALPHA",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 2,
        "token": "STORE",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "sort_ro": {
    "summary": "Returns the sorted elements of a list, a set, or a sorted set.",
    "since": "7.0.0",
    "group": "generic",
    "complexity": "O(N+M*log(M)) where N is the number of elements in the list or set to sort, and M the number of returned elements. When the elements are not sorted, complexity is O(N).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "by-pattern",
        "type": "pattern",
        "display_text": "pattern",
        "key_spec_index": 1,
        "token": "BY",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      },
      {
        "name": "get-pattern",
        "type": "pattern",
        "display_text": "pattern",
        "key_spec_index": 1,
        "token": "GET",
        "flags": [
          "optional",
          "multiple",
          "multiple_token"
        ]
      },
      {
        "name": "order",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "asc",
            "type": "pure-token",
            "display_text": "asc",
            "token": "ASC"
          },
          {
            "name": "desc",
            "type": "pure-token",
            "display_text": "desc",
            "token": "DESC"
          }
        ]
      },
      {
        "name": "sorting",
        "type": "pure-token",
        "display_text": "sorting",
        "token": "ALPHA",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "spop": {
    "summary": "Returns one or more random members from a set after removing them. Deletes the set if the last member was popped.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "Without the count argument O(1), otherwise O(N) where N is the value of the passed count.",
    "history": {
      "3.2.0": "Added the `count` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "since": "3.2.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "spublish": {
    "summary": "Post a message to a shard channel",
    "since": "7.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of clients subscribed to the receiving shard channel.",
    "arguments": [
      {
        "name": "shardchannel",
        "type": "string",
        "display_text": "shardchannel"
      },
      {
        "name": "message",
        "type": "string",
        "display_text": "message"
      }
    ]
  },
  "srandmember": {
    "summary": "Get one or multiple random members from a set",
    "since": "1.0.0",
    "group": "set",
    "complexity": "Without the count argument O(1), otherwise O(N) where N is the absolute value of the passed count.",
    "history": {
      "2.6.0": "Added the optional `count` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "since": "2.6.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "srem": {
    "summary": "Removes one or more members from a set. Deletes the set if the last member was removed.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the number of members to be removed.",
    "history": {
      "2.4.0": "Accepts multiple `member` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sscan": {
    "summary": "Iterates over members of a set.",
    "since": "2.8.0",
    "group": "set",
    "complexity": "O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return back to 0. N is the number of elements inside the collection.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "cursor",
        "type": "integer",
        "display_text": "cursor"
      },
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "token": "MATCH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "ssubscribe": {
    "summary": "Listens for messages published to shard channels.",
    "since": "7.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of shard channels to subscribe to.",
    "arguments": [
      {
        "name": "shardchannel",
        "type": "string",
        "display_text": "shardchannel",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "strlen": {
    "summary": "Returns the length of a string value.",
    "since": "2.2.0",
    "group": "string",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "subscribe": {
    "summary": "Listens for messages published to channels.",
    "since": "2.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of channels to subscribe to.",
    "arguments": [
      {
        "name": "channel",
        "type": "string",
        "display_text": "channel",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "substr": {
    "summary": "Returns a substring from a string value.",
    "since": "1.0.0",
    "group": "string",
    "complexity": "O(N) where N is the length of the returned string. The complexity is ultimately determined by the returned length, but because creating a substring from an existing string is very cheap, it can be considered O(1) for small strings.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "2.0.0",
    "replaced_by": "`GETRANGE`",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "end",
        "type": "integer",
        "display_text": "end"
      }
    ]
  },
  "sunion": {
    "summary": "Returns the union of multiple sets.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the total number of elements in all given sets.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sunionstore": {
    "summary": "Stores the union of multiple sets in a key.",
    "since": "1.0.0",
    "group": "set",
    "complexity": "O(N) where N is the total number of elements in all given sets.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "sunsubscribe": {
    "summary": "Stops listening to messages posted to shard channels.",
    "since": "7.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of shard channels to unsubscribe.",
    "arguments": [
      {
        "name": "shardchannel",
        "type": "string",
        "display_text": "shardchannel",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "swapdb": {
    "summary": "Swaps two Redis databases.",
    "since": "4.0.0",
    "group": "server",
    "complexity": "O(N) where N is the count of clients watching or blocking on keys from both databases.",
    "arguments": [
      {
        "name": "index1",
        "type": "integer",
        "display_text": "index1"
      },
      {
        "name": "index2",
        "type": "integer",
        "display_text": "index2"
      }
    ]
  },
  "sync": {
    "summary": "An internal command used in replication.",
    "since": "1.0.0",
    "group": "server"
  },
  "time": {
    "summary": "Returns the server time.",
    "since": "2.6.0",
    "group": "server",
    "complexity": "O(1)"
  },
  "touch": {
    "summary": "Returns the number of existing keys out of those specified after updating the time they were last accessed.",
    "since": "3.2.1",
    "group": "generic",
    "complexity": "O(N) where N is the number of keys that will be touched.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "ttl": {
    "summary": "Returns the expiration time in seconds of a key.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "history": {
      "2.8.0": "Added the -2 reply."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "type": {
    "summary": "Determines the type of value stored at a key.",
    "since": "1.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "unlink": {
    "summary": "Asynchronously deletes one or more keys.",
    "since": "4.0.0",
    "group": "generic",
    "complexity": "O(1) for each key removed regardless of its size. Then the command does O(N) work in a different thread in order to reclaim memory, where N is the number of allocations the deleted objects where composed of.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "unsubscribe": {
    "summary": "Stops listening to messages posted to channels.",
    "since": "2.0.0",
    "group": "pubsub",
    "complexity": "O(N) where N is the number of channels to unsubscribe.",
    "arguments": [
      {
        "name": "channel",
        "type": "string",
        "display_text": "channel",
        "flags": [
          "optional",
          "multiple"
        ]
      }
    ]
  },
  "unwatch": {
    "summary": "Forgets about watched keys of a transaction.",
    "since": "2.2.0",
    "group": "transactions",
    "complexity": "O(1)"
  },
  "vadd": {
    "group": "module",
    "module": "vectorset"
  },
  "vcard": {
    "group": "module",
    "module": "vectorset"
  },
  "vdim": {
    "group": "module",
    "module": "vectorset"
  },
  "vemb": {
    "group": "module",
    "module": "vectorset"
  },
  "vgetattr": {
    "group": "module",
    "module": "vectorset"
  },
  "vinfo": {
    "group": "module",
    "module": "vectorset"
  },
  "vismember": {
    "group": "module",
    "module": "vectorset"
  },
  "vlinks": {
    "group": "module",
    "module": "vectorset"
  },
  "vrandmember": {
    "group": "module",
    "module": "vectorset"
  },
  "vrem": {
    "group": "module",
    "module": "vectorset"
  },
  "vsetattr": {
    "group": "module",
    "module": "vectorset"
  },
  "vsim": {
    "group": "module",
    "module": "vectorset"
  },
  "wait": {
    "summary": "Blocks until the asynchronous replication of all preceding write commands sent by the connection is completed.",
    "since": "3.0.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "numreplicas",
        "type": "integer",
        "display_text": "numreplicas"
      },
      {
        "name": "timeout",
        "type": "integer",
        "display_text": "timeout"
      }
    ]
  },
  "waitaof": {
    "summary": "Blocks until all of the preceding write commands sent by the connection are written to the append-only file of the master and/or replicas.",
    "since": "7.2.0",
    "group": "generic",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "numlocal",
        "type": "integer",
        "display_text": "numlocal"
      },
      {
        "name": "numreplicas",
        "type": "integer",
        "display_text": "numreplicas"
      },
      {
        "name": "timeout",
        "type": "integer",
        "display_text": "timeout"
      }
    ]
  },
  "watch": {
    "summary": "Monitors changes to keys to determine the execution of a transaction.",
    "since": "2.2.0",
    "group": "transactions",
    "complexity": "O(1) for every key.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "xack": {
    "summary": "Returns the number of messages that were successfully acknowledged by the consumer group member of a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1) for each message ID processed.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "id",
        "type": "string",
        "display_text": "id",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "xadd": {
    "summary": "Appends a new message to a stream. Creates the key if it doesn't exist.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1) when adding a new entry, O(N) when trimming where N being the number of entries evicted.",
    "history": {
      "6.2.0": "Added the `NOMKSTREAM` option, `MINID` trimming strategy and the `LIMIT` option.",
      "7.0.0": "Added support for the `<ms>-*` explicit ID form."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "nomkstream",
        "type": "pure-token",
        "display_text": "nomkstream",
        "token": "NOMKSTREAM",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "trim",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "strategy",
            "type": "oneof",
            "arguments": [
              {
                "name": "maxlen",
                "type": "pure-token",
                "display_text": "maxlen",
                "token": "MAXLEN"
              },
              {
                "name": "minid",
                "type": "pure-token",
                "display_text": "minid",
                "token": "MINID",
                "since": "6.2.0"
              }
            ]
          },
          {
            "name": "operator",
            "type": "oneof",
            "flags": [
              "optional"
            ],
            "arguments": [
              {
                "name": "equal",
                "type": "pure-token",
                "display_text": "equal",
                "token": "="
              },
              {
                "name": "approximately",
                "type": "pure-token",
                "display_text": "approximately",
                "token": "~"
              }
            ]
          },
          {
            "name": "threshold",
            "type": "string",
            "display_text": "threshold"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "LIMIT",
            "since": "6.2.0",
            "flags": [
              "optional"
            ]
          }
        ]
      },
      {
        "name": "id-selector",
        "type": "oneof",
        "arguments": [
          {
            "name": "auto-id",
            "type": "pure-token",
            "display_text": "auto-id",
            "token": "*"
          },
          {
            "name": "id",
            "type": "string",
            "display_text": "id"
          }
        ]
      },
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "field",
            "type": "string",
            "display_text": "field"
          },
          {
            "name": "value",
            "type": "string",
            "display_text": "value"
          }
        ]
      }
    ]
  },
  "xautoclaim": {
    "summary": "Changes, or acquires, ownership of messages in a consumer group, as if the messages were delivered to as consumer group member.",
    "since": "6.2.0",
    "group": "stream",
    "complexity": "O(1) if COUNT is small.",
    "history": {
      "7.0.0": "Added an element to the reply array, containing deleted entries the command cleared from the PEL"
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "consumer",
        "type": "string",
        "display_text": "consumer"
      },
      {
        "name": "min-idle-time",
        "type": "string",
        "display_text": "min-idle-time"
      },
      {
        "name": "start",
        "type": "string",
        "display_text": "start"
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "justid",
        "type": "pure-token",
        "display_text": "justid",
        "token": "JUSTID",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xclaim": {
    "summary": "Changes, or acquires, ownership of a message in a consumer group, as if the message was delivered a consumer group member.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(log N) with N being the number of messages in the PEL of the consumer group.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "consumer",
        "type": "string",
        "display_text": "consumer"
      },
      {
        "name": "min-idle-time",
        "type": "string",
        "display_text": "min-idle-time"
      },
      {
        "name": "id",
        "type": "string",
        "display_text": "id",
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "ms",
        "type": "integer",
        "display_text": "ms",
        "token": "IDLE",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "unix-time-milliseconds",
        "type": "unix-time",
        "display_text": "unix-time-milliseconds",
        "token": "TIME",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "RETRYCOUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "force",
        "type": "pure-token",
        "display_text": "force",
        "token": "FORCE",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "justid",
        "type": "pure-token",
        "display_text": "justid",
        "token": "JUSTID",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "lastid",
        "type": "string",
        "display_text": "lastid",
        "token": "LASTID",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xdel": {
    "summary": "Returns the number of messages after removing them from a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1) for each single item to delete in the stream, regardless of the stream size.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "id",
        "type": "string",
        "display_text": "id",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "xgroup create": {
    "summary": "Creates a consumer group.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added the `entries_read` named argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "id-selector",
        "type": "oneof",
        "arguments": [
          {
            "name": "id",
            "type": "string",
            "display_text": "id"
          },
          {
            "name": "new-id",
            "type": "pure-token",
            "display_text": "new-id",
            "token": "$"
          }
        ]
      },
      {
        "name": "mkstream",
        "type": "pure-token",
        "display_text": "mkstream",
        "token": "MKSTREAM",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "entriesread",
        "type": "integer",
        "display_text": "entries-read",
        "token": "ENTRIESREAD",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xgroup createconsumer": {
    "summary": "Creates a consumer in a consumer group.",
    "since": "6.2.0",
    "group": "stream",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "consumer",
        "type": "string",
        "display_text": "consumer"
      }
    ]
  },
  "xgroup delconsumer": {
    "summary": "Deletes a consumer from a consumer group.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "consumer",
        "type": "string",
        "display_text": "consumer"
      }
    ]
  },
  "xgroup destroy": {
    "summary": "Destroys a consumer group.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(N) where N is the number of entries in the group's pending entries list (PEL).",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      }
    ]
  },
  "xgroup help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)"
  },
  "xgroup setid": {
    "summary": "Sets the last-delivered ID of a consumer group.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added the optional `entries_read` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "id-selector",
        "type": "oneof",
        "arguments": [
          {
            "name": "id",
            "type": "string",
            "display_text": "id"
          },
          {
            "name": "new-id",
            "type": "pure-token",
            "display_text": "new-id",
            "token": "$"
          }
        ]
      },
      {
        "name": "entriesread",
        "type": "integer",
        "display_text": "entries-read",
        "token": "ENTRIESREAD",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xinfo consumers": {
    "summary": "Returns a list of the consumers in a consumer group.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "7.2.0": "Added the `inactive` field, and changed the meaning of `idle`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      }
    ]
  },
  "xinfo groups": {
    "summary": "Returns a list of the consumer groups of a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added the `entries-read` and `lag` fields"
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "xinfo help": {
    "summary": "Returns helpful text about the different subcommands.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)"
  },
  "xinfo stream": {
    "summary": "Returns information about a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "6.0.0": "Added the `FULL` modifier.",
      "7.0.0": "Added the `max-deleted-entry-id`, `entries-added`, `recorded-first-entry-id`, `entries-read` and `lag` fields",
      "7.2.0": "Added the `active-time` field, and changed the meaning of `seen-time`."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "full-block",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "full",
            "type": "pure-token",
            "display_text": "full",
            "token": "FULL"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "COUNT",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "xlen": {
    "summary": "Return the number of messages in a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "xpending": {
    "summary": "Returns the information and entries from a stream consumer group's pending entries list.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(N) with N being the number of elements returned, so asking for a small fixed number of entries per call is O(1). O(M), where M is the total number of entries scanned when used with the IDLE filter. When the command returns just the summary and the list of consumers is small, it runs in O(1) time; otherwise, an additional O(N) time for iterating every consumer.",
    "history": {
      "6.2.0": "Added the `IDLE` option and exclusive range intervals."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "group",
        "type": "string",
        "display_text": "group"
      },
      {
        "name": "filters",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "min-idle-time",
            "type": "integer",
            "display_text": "min-idle-time",
            "token": "IDLE",
            "since": "6.2.0",
            "flags": [
              "optional"
            ]
          },
          {
            "name": "start",
            "type": "string",
            "display_text": "start"
          },
          {
            "name": "end",
            "type": "string",
            "display_text": "end"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          },
          {
            "name": "consumer",
            "type": "string",
            "display_text": "consumer",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "xrange": {
    "summary": "Returns the messages from a stream within a range of IDs.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(N) with N being the number of elements being returned. If N is constant (e.g. always asking for the first 10 elements with COUNT), you can consider it O(1).",
    "history": {
      "6.2.0": "Added exclusive ranges."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "string",
        "display_text": "start"
      },
      {
        "name": "end",
        "type": "string",
        "display_text": "end"
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xread": {
    "summary": "Returns messages from multiple streams with IDs greater than the ones requested. Blocks until a message is available otherwise.",
    "since": "5.0.0",
    "group": "stream",
    "arguments": [
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds",
        "token": "BLOCK",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "streams",
        "type": "block",
        "token": "STREAMS",
        "arguments": [
          {
            "name": "key",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 0,
            "flags": [
              "multiple"
            ]
          },
          {
            "name": "id",
            "type": "string",
            "display_text": "id",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "xreadgroup": {
    "summary": "Returns new or historical messages from a stream for a consumer in a group. Blocks until a message is available otherwise.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "For each stream mentioned: O(M) with M being the number of elements returned. If M is constant (e.g. always asking for the first 10 elements with COUNT), you can consider it O(1). On the other side when XREADGROUP blocks, XADD will pay the O(N) time in order to serve the N clients blocked on the stream getting new data.",
    "arguments": [
      {
        "name": "group-block",
        "type": "block",
        "token": "GROUP",
        "arguments": [
          {
            "name": "group",
            "type": "string",
            "display_text": "group"
          },
          {
            "name": "consumer",
            "type": "string",
            "display_text": "consumer"
          }
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "milliseconds",
        "type": "integer",
        "display_text": "milliseconds",
        "token": "BLOCK",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "noack",
        "type": "pure-token",
        "display_text": "noack",
        "token": "NOACK",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "streams",
        "type": "block",
        "token": "STREAMS",
        "arguments": [
          {
            "name": "key",
            "type": "key",
            "display_text": "key",
            "key_spec_index": 0,
            "flags": [
              "multiple"
            ]
          },
          {
            "name": "id",
            "type": "string",
            "display_text": "id",
            "flags": [
              "multiple"
            ]
          }
        ]
      }
    ]
  },
  "xrevrange": {
    "summary": "Returns the messages from a stream within a range of IDs in reverse order.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(N) with N being the number of elements returned. If N is constant (e.g. always asking for the first 10 elements with COUNT), you can consider it O(1).",
    "history": {
      "6.2.0": "Added exclusive ranges."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "end",
        "type": "string",
        "display_text": "end"
      },
      {
        "name": "start",
        "type": "string",
        "display_text": "start"
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xsetid": {
    "summary": "An internal command for replicating stream values.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(1)",
    "history": {
      "7.0.0": "Added the `entries_added` and `max_deleted_entry_id` arguments."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "last-id",
        "type": "string",
        "display_text": "last-id"
      },
      {
        "name": "entries-added",
        "type": "integer",
        "display_text": "entries-added",
        "token": "ENTRIESADDED",
        "since": "7.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "max-deleted-id",
        "type": "string",
        "display_text": "max-deleted-id",
        "token": "MAXDELETEDID",
        "since": "7.0.0",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "xtrim": {
    "summary": "Deletes messages from the beginning of a stream.",
    "since": "5.0.0",
    "group": "stream",
    "complexity": "O(N), with N being the number of evicted entries. Constant times are very small however, since entries are organized in macro nodes containing multiple entries that can be released with a single deallocation.",
    "history": {
      "6.2.0": "Added the `MINID` trimming strategy and the `LIMIT` option."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "trim",
        "type": "block",
        "arguments": [
          {
            "name": "strategy",
            "type": "oneof",
            "arguments": [
              {
                "name": "maxlen",
                "type": "pure-token",
                "display_text": "maxlen",
                "token": "MAXLEN"
              },
              {
                "name": "minid",
                "type": "pure-token",
                "display_text": "minid",
                "token": "MINID",
                "since": "6.2.0"
              }
            ]
          },
          {
            "name": "operator",
            "type": "oneof",
            "flags": [
              "optional"
            ],
            "arguments": [
              {
                "name": "equal",
                "type": "pure-token",
                "display_text": "equal",
                "token": "="
              },
              {
                "name": "approximately",
                "type": "pure-token",
                "display_text": "approximately",
                "token": "~"
              }
            ]
          },
          {
            "name": "threshold",
            "type": "string",
            "display_text": "threshold"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count",
            "token": "LIMIT",
            "since": "6.2.0",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "zadd": {
    "summary": "Adds one or more members to a sorted set, or updates their scores. Creates the key if it doesn't exist.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)) for each item added, where N is the number of elements in the sorted set.",
    "history": {
      "2.4.0": "Accepts multiple elements.",
      "3.0.2": "Added the `XX`, `NX`, `CH` and `INCR` options.",
      "6.2.0": "Added the `GT` and `LT` options."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "condition",
        "type": "oneof",
        "since": "3.0.2",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "nx",
            "type": "pure-token",
            "display_text": "nx",
            "token": "NX"
          },
          {
            "name": "xx",
            "type": "pure-token",
            "display_text": "xx",
            "token": "XX"
          }
        ]
      },
      {
        "name": "comparison",
        "type": "oneof",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "gt",
            "type": "pure-token",
            "display_text": "gt",
            "token": "GT"
          },
          {
            "name": "lt",
            "type": "pure-token",
            "display_text": "lt",
            "token": "LT"
          }
        ]
      },
      {
        "name": "change",
        "type": "pure-token",
        "display_text": "change",
        "token": "CH",
        "since": "3.0.2",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "increment",
        "type": "pure-token",
        "display_text": "increment",
        "token": "INCR",
        "since": "3.0.2",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "data",
        "type": "block",
        "flags": [
          "multiple"
        ],
        "arguments": [
          {
            "name": "score",
            "type": "double",
            "display_text": "score"
          },
          {
            "name": "member",
            "type": "string",
            "display_text": "member"
          }
        ]
      }
    ]
  },
  "zcard": {
    "summary": "Returns the number of members in a sorted set.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      }
    ]
  },
  "zcount": {
    "summary": "Returns the count of members in a sorted set that have scores within a range.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)) with N being the number of elements in the sorted set.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "double",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "double",
        "display_text": "max"
      }
    ]
  },
  "zdiff": {
    "summary": "Returns the difference between multiple sorted sets.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(L + (N-K)log(N)) worst case where L is the total number of elements in all the sets, N is the size of the first set, and K is the size of the result set.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zdiffstore": {
    "summary": "Stores the difference of multiple sorted sets in a key.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(L + (N-K)log(N)) worst case where L is the total number of elements in all the sets, N is the size of the first set, and K is the size of the result set.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "zincrby": {
    "summary": "Increments the score of a member in a sorted set.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)) where N is the number of elements in the sorted set.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "increment",
        "type": "integer",
        "display_text": "increment"
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      }
    ]
  },
  "zinter": {
    "summary": "Returns the intersect of multiple sorted sets.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(N*K)+O(M*log(M)) worst case with N being the smallest input sorted set, K being the number of input sorted sets and M being the number of elements in the resulting sorted set.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "weight",
        "type": "integer",
        "display_text": "weight",
        "token": "WEIGHTS",
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "aggregate",
        "type": "oneof",
        "token": "AGGREGATE",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "sum",
            "type": "pure-token",
            "display_text": "sum",
            "token": "SUM"
          },
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zintercard": {
    "summary": "Returns the number of members of the intersect of multiple sorted sets.",
    "since": "7.0.0",
    "group": "sorted-set",
    "complexity": "O(N*K) worst case with N being the smallest input sorted set, K being the number of input sorted sets.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "limit",
        "type": "integer",
        "display_text": "limit",
        "token": "LIMIT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zinterstore": {
    "summary": "Stores the intersect of multiple sorted sets in a key.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(N*K)+O(M*log(M)) worst case with N being the smallest input sorted set, K being the number of input sorted sets and M being the number of elements in the resulting sorted set.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "weight",
        "type": "integer",
        "display_text": "weight",
        "token": "WEIGHTS",
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "aggregate",
        "type": "oneof",
        "token": "AGGREGATE",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "sum",
            "type": "pure-token",
            "display_text": "sum",
            "token": "SUM"
          },
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      }
    ]
  },
  "zlexcount": {
    "summary": "Returns the number of members in a sorted set within a lexicographical range.",
    "since": "2.8.9",
    "group": "sorted-set",
    "complexity": "O(log(N)) with N being the number of elements in the sorted set.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "string",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "string",
        "display_text": "max"
      }
    ]
  },
  "zmpop": {
    "summary": "Returns the highest- or lowest-scoring members from one or more sorted sets after removing them. Deletes the sorted set if the last member was popped.",
    "since": "7.0.0",
    "group": "sorted-set",
    "complexity": "O(K) + O(M*log(N)) where K is the number of provided keys, N being the number of elements in the sorted set, and M being the number of elements popped.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "where",
        "type": "oneof",
        "arguments": [
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zmscore": {
    "summary": "Returns the score of one or more members in a sorted set.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(N) where N is the number of members being requested.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "zpopmax": {
    "summary": "Returns the highest-scoring members from a sorted set after removing them. Deletes the sorted set if the last member was popped.",
    "since": "5.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)*M) with N being the number of elements in the sorted set, and M being the number of elements popped.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zpopmin": {
    "summary": "Returns the lowest-scoring members from a sorted set after removing them. Deletes the sorted set if the last member was popped.",
    "since": "5.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)*M) with N being the number of elements in the sorted set, and M being the number of elements popped.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zrandmember": {
    "summary": "Returns one or more random members from a sorted set.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(N) where N is the number of members returned",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "options",
        "type": "block",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          },
          {
            "name": "withscores",
            "type": "pure-token",
            "display_text": "withscores",
            "token": "WITHSCORES",
            "flags": [
              "optional"
            ]
          }
        ]
      }
    ]
  },
  "zrange": {
    "summary": "Returns members in a sorted set within a range of indexes.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned.",
    "history": {
      "6.2.0": "Added the `REV`, `BYSCORE`, `BYLEX` and `LIMIT` options."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "string",
        "display_text": "start"
      },
      {
        "name": "stop",
        "type": "string",
        "display_text": "stop"
      },
      {
        "name": "sortby",
        "type": "oneof",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "byscore",
            "type": "pure-token",
            "display_text": "byscore",
            "token": "BYSCORE"
          },
          {
            "name": "bylex",
            "type": "pure-token",
            "display_text": "bylex",
            "token": "BYLEX"
          }
        ]
      },
      {
        "name": "rev",
        "type": "pure-token",
        "display_text": "rev",
        "token": "REV",
        "since": "6.2.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "since": "6.2.0",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zrangebylex": {
    "summary": "Returns members in a sorted set within a lexicographical range.",
    "since": "2.8.9",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements being returned. If M is constant (e.g. always asking for the first 10 elements with LIMIT), you can consider it O(log(N)).",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`ZRANGE` with the `BYLEX` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "string",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "string",
        "display_text": "max"
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      }
    ]
  },
  "zrangebyscore": {
    "summary": "Returns members in a sorted set within a range of scores.",
    "since": "1.0.5",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements being returned. If M is constant (e.g. always asking for the first 10 elements with LIMIT), you can consider it O(log(N)).",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`ZRANGE` with the `BYSCORE` argument",
    "history": {
      "2.0.0": "Added the `WITHSCORES` modifier."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "double",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "double",
        "display_text": "max"
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "since": "2.0.0",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      }
    ]
  },
  "zrangestore": {
    "summary": "Stores a range of members from sorted set in a key.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements stored into the destination key.",
    "arguments": [
      {
        "name": "dst",
        "type": "key",
        "display_text": "dst",
        "key_spec_index": 0
      },
      {
        "name": "src",
        "type": "key",
        "display_text": "src",
        "key_spec_index": 1
      },
      {
        "name": "min",
        "type": "string",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "string",
        "display_text": "max"
      },
      {
        "name": "sortby",
        "type": "oneof",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "byscore",
            "type": "pure-token",
            "display_text": "byscore",
            "token": "BYSCORE"
          },
          {
            "name": "bylex",
            "type": "pure-token",
            "display_text": "bylex",
            "token": "BYLEX"
          }
        ]
      },
      {
        "name": "rev",
        "type": "pure-token",
        "display_text": "rev",
        "token": "REV",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      }
    ]
  },
  "zrank": {
    "summary": "Returns the index of a member in a sorted set ordered by ascending scores.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N))",
    "history": {
      "7.2.0": "Added the optional `WITHSCORE` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      },
      {
        "name": "withscore",
        "type": "pure-token",
        "display_text": "withscore",
        "token": "WITHSCORE",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zrem": {
    "summary": "Removes one or more members from a sorted set. Deletes the sorted set if all members were removed.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(M*log(N)) with N being the number of elements in the sorted set and M the number of elements to be removed.",
    "history": {
      "2.4.0": "Accepts multiple elements."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member",
        "flags": [
          "multiple"
        ]
      }
    ]
  },
  "zremrangebylex": {
    "summary": "Removes members in a sorted set within a lexicographical range. Deletes the sorted set if all members were removed.",
    "since": "2.8.9",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements removed by the operation.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "string",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "string",
        "display_text": "max"
      }
    ]
  },
  "zremrangebyrank": {
    "summary": "Removes members in a sorted set within a range of indexes. Deletes the sorted set if all members were removed.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements removed by the operation.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "stop",
        "type": "integer",
        "display_text": "stop"
      }
    ]
  },
  "zremrangebyscore": {
    "summary": "Removes members in a sorted set within a range of scores. Deletes the sorted set if all members were removed.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements removed by the operation.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "min",
        "type": "double",
        "display_text": "min"
      },
      {
        "name": "max",
        "type": "double",
        "display_text": "max"
      }
    ]
  },
  "zrevrange": {
    "summary": "Returns members in a sorted set within a range of indexes in reverse order.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned.",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`ZRANGE` with the `REV` argument",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "start",
        "type": "integer",
        "display_text": "start"
      },
      {
        "name": "stop",
        "type": "integer",
        "display_text": "stop"
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zrevrangebylex": {
    "summary": "Returns members in a sorted set within a lexicographical range in reverse order.",
    "since": "2.8.9",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements being returned. If M is constant (e.g. always asking for the first 10 elements with LIMIT), you can consider it O(log(N)).",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`ZRANGE` with the `REV` and `BYLEX` arguments",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "max",
        "type": "string",
        "display_text": "max"
      },
      {
        "name": "min",
        "type": "string",
        "display_text": "min"
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      }
    ]
  },
  "zrevrangebyscore": {
    "summary": "Returns members in a sorted set within a range of scores in reverse order.",
    "since": "2.2.0",
    "group": "sorted-set",
    "complexity": "O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements being returned. If M is constant (e.g. always asking for the first 10 elements with LIMIT), you can consider it O(log(N)).",
    "doc_flags": [
      "deprecated"
    ],
    "deprecated_since": "6.2.0",
    "replaced_by": "`ZRANGE` with the `REV` and `BYSCORE` arguments",
    "history": {
      "2.1.6": "`min` and `max` can be exclusive."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "max",
        "type": "double",
        "display_text": "max"
      },
      {
        "name": "min",
        "type": "double",
        "display_text": "min"
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "limit",
        "type": "block",
        "token": "LIMIT",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "offset",
            "type": "integer",
            "display_text": "offset"
          },
          {
            "name": "count",
            "type": "integer",
            "display_text": "count"
          }
        ]
      }
    ]
  },
  "zrevrank": {
    "summary": "Returns the index of a member in a sorted set ordered by descending scores.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(log(N))",
    "history": {
      "7.2.0": "Added the optional `WITHSCORE` argument."
    },
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      },
      {
        "name": "withscore",
        "type": "pure-token",
        "display_text": "withscore",
        "token": "WITHSCORE",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zscan": {
    "summary": "Iterates over members and scores of a sorted set.",
    "since": "2.8.0",
    "group": "sorted-set",
    "complexity": "O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return back to 0. N is the number of elements inside the collection.",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "cursor",
        "type": "integer",
        "display_text": "cursor"
      },
      {
        "name": "pattern",
        "type": "pattern",
        "display_text": "pattern",
        "token": "MATCH",
        "flags": [
          "optional"
        ]
      },
      {
        "name": "count",
        "type": "integer",
        "display_text": "count",
        "token": "COUNT",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zscore": {
    "summary": "Returns the score of a member in a sorted set.",
    "since": "1.2.0",
    "group": "sorted-set",
    "complexity": "O(1)",
    "arguments": [
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0
      },
      {
        "name": "member",
        "type": "string",
        "display_text": "member"
      }
    ]
  },
  "zunion": {
    "summary": "Returns the union of multiple sorted sets.",
    "since": "6.2.0",
    "group": "sorted-set",
    "complexity": "O(N)+O(M*log(M)) with N being the sum of the sizes of the input sorted sets, and M being the number of elements in the resulting sorted set.",
    "arguments": [
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 0,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "weight",
        "type": "integer",
        "display_text": "weight",
        "token": "WEIGHTS",
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "aggregate",
        "type": "oneof",
        "token": "AGGREGATE",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "sum",
            "type": "pure-token",
            "display_text": "sum",
            "token": "SUM"
          },
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      },
      {
        "name": "withscores",
        "type": "pure-token",
        "display_text": "withscores",
        "token": "WITHSCORES",
        "flags": [
          "optional"
        ]
      }
    ]
  },
  "zunionstore": {
    "summary": "Stores the union of multiple sorted sets in a key.",
    "since": "2.0.0",
    "group": "sorted-set",
    "complexity": "O(N)+O(M log(M)) with N being the sum of the sizes of the input sorted sets, and M being the number of elements in the resulting sorted set.",
    "arguments": [
      {
        "name": "destination",
        "type": "key",
        "display_text": "destination",
        "key_spec_index": 0
      },
      {
        "name": "numkeys",
        "type": "integer",
        "display_text": "numkeys"
      },
      {
        "name": "key",
        "type": "key",
        "display_text": "key",
        "key_spec_index": 1,
        "flags": [
          "multiple"
        ]
      },
      {
        "name": "weight",
        "type": "integer",
        "display_text": "weight",
        "token": "WEIGHTS",
        "flags": [
          "optional",
          "multiple"
        ]
      },
      {
        "name": "aggregate",
        "type": "oneof",
        "token": "AGGREGATE",
        "flags": [
          "optional"
        ],
        "arguments": [
          {
            "name": "sum",
            "type": "pure-token",
            "display_text": "sum",
            "token": "SUM"
          },
          {
            "name": "min",
            "type": "pure-token",
            "display_text": "min",
            "token": "MIN"
          },
          {
            "name": "max",
            "type": "pure-token",
            "display_text": "max",
            "token": "MAX"
          }
        ]
      }
    ]
  }
} as const;
