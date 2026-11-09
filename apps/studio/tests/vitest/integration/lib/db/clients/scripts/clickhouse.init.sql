CREATE TABLE votes
(
    `Id` UInt32,
    `PostId` Int32,
    `VoteTypeId` UInt8,
    `CreationDate` DateTime64(3, 'UTC'),
    `UserId` Int32,
    `BountyAmount` UInt8
)
ENGINE = MergeTree
ORDER BY (VoteTypeId, CreationDate, PostId, UserId);

CREATE TABLE up_down_votes_per_day
(
  `Day` Date,
  `UpVotes` UInt32,
  `DownVotes` UInt32
)
ENGINE = SummingMergeTree
ORDER BY Day;

CREATE MATERIALIZED VIEW up_down_votes_per_day_mv TO up_down_votes_per_day AS
SELECT toStartOfDay(CreationDate)::Date AS Day,
       countIf(VoteTypeId = 2) AS UpVotes,
       countIf(VoteTypeId = 3) AS DownVotes
FROM votes
GROUP BY Day;

INSERT INTO votes (Id, PostId, VoteTypeId, CreationDate, UserId, BountyAmount) VALUES
(1, 101, 1, '2023-01-01 12:00:00.123', 1001, 0),
(2, 102, 2, '2023-01-02 14:30:15.456', 1002, 50),
(3, 103, 1, '2023-01-03 16:45:30.789', 1003, 0),
(4, 104, 3, '2023-01-04 18:00:45.012', 1004, 100),
(5, 105, 2, '2023-01-05 20:15:59.321', 1005, 75);
