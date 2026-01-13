---
title: Amazon RDS
summary: Como conectar aos bancos de dados RDS 'especiais' da Amazon usando tipos de autenticação nativos
icon: material/cloud
---

Conectar ao Amazon RDS requer que você configure um usuário IAM e garanta que seu grupo de segurança permite tráfego do seu endereço IP.

## Configuração IAM na Amazon

Para configurar acesso IAM DB, garanta que o DB na AWS está configurado para permitir autenticação IAM. Isso pode ser feito modificando a instância do DB e habilitando autenticação IAM DB.
Você então precisará criar um usuário IAM e anexar a política `AmazonRDSFullAccess` ao usuário. Esta política permite que o usuário se conecte à instância RDS.

Você também pode usar uma política similar à abaixo:

``
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds-db:connect"
            ],
            "Resource": [
                "arn:aws:rds:eu-north-1:USERID:db:DB_NAME/USERNAME"
            ]
        }
    ]
}
``

## Conectando ao Amazon RDS

Abaixo está um exemplo de configuração no Beekeeper Studio uma vez que permissões IAM estão configuradas, você precisará do hostname, porta, username, AWS Region e se você tem múltiplos perfis Amazon pode especificar o perfil que quer usar.

![Image Alt Tag](../../assets/images/amazon-rds-config.png)

## Coisas a notar

- SSL é obrigatório na maioria das instâncias RDS, então garanta que isso está marcado.
- Você precisará de um arquivo de credenciais configurado e precisaria seguir o guia linkado para configurar isso:
[Configuração AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)

## Alguns links úteis

- [Configuração AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [Autenticação AWS IAM DB](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Política AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)
- [Usuário AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html)
- [Roles AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html)