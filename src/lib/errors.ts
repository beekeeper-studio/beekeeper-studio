// Copyright (c) 2015 The SQLECTRON Team

export interface Error {
  code: string;
  name: string;
  message: string;
}

export const errors: {[code: string]: Error} = {
  CANCELED_BY_USER: {
    code: 'CANCELED_BY_USER',
    name: 'Query canceled by user',
    message: 'Query canceled by user. The query process may still in the process list. But has already received the command to kill it successfully.',
  }
};

