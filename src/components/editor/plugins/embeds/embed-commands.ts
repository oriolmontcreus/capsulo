import { createCommand, type LexicalCommand } from "lexical"

export const INSERT_TWEET_COMMAND: LexicalCommand<string> = createCommand(
    "INSERT_TWEET_COMMAND"
)

export const INSERT_YOUTUBE_COMMAND: LexicalCommand<string> = createCommand(
    "INSERT_YOUTUBE_COMMAND"
)
