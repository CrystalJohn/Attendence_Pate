import { z } from 'zod';
import { MASCOT_IDS } from './mascotIds';

export const checkinSchema = z.object({
  memberId: z.string().min(1, 'Hãy chọn tên hoặc nhập tên mới.'),
  mascotId: z.enum(MASCOT_IDS, { error: 'Hãy chọn linh vật đồng hành.' }),
  mood: z.string().min(1, 'Hãy chọn tâm trạng hôm nay.'),
});

export type CheckinFormValues = z.infer<typeof checkinSchema>;
