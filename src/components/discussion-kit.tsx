'use client';

import type { TComment } from '@/components/ui/comment';

import { createPlatePlugin } from 'platejs/react';

import { BlockDiscussion } from '@/components/ui/block-discussion';

export interface TDiscussion {
  id: string;
  comments: TComment[];
  createdAt: Date;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
}

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;

// This plugin is purely UI. It's only used to store the discussions and users data
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    currentUserId: 'default-user',
    discussions: [] as TDiscussion[],
    users: {} as Record<string, { id: string; avatarUrl: string; name: string; hue?: number }>,
  },
})
  .configure({
    render: { aboveNodes: BlockDiscussion },
  })
  .extendSelectors(({ getOption }) => ({
    currentUser: () => {
      const users = getOption('users') as Record<string, any>;
      const userId = getOption('currentUserId') as string;
      return users[userId];
    },
    user: (id: string) => {
      const users = getOption('users') as Record<string, any>;
      return users[id];
    },
  }));

export const DiscussionKit = [discussionPlugin];
