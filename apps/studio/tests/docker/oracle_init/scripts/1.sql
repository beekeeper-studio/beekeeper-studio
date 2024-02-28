
ALTER SESSION SET CONTAINER=BEEKEEPER;
--
-- Table structure for table actor, just to get things working
--
--DROP TABLE actor;

CREATE TABLE actor (
  actor_id numeric NOT NULL ,
  first_name VARCHAR(45) NOT NULL,
  last_name VARCHAR(45) NOT NULL,
  CONSTRAINT pk_actor PRIMARY KEY  (actor_id)
);
