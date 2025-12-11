
import { z } from 'zod';

const schema = z.string().superRefine((val, ctx) => {
    console.log('Ctx keys:', Object.keys(ctx));
    console.log('Ctx:', ctx);
    // console.log('This:', this);
});

try {
    console.log("Parsing with context...");
    schema.parse("test", { extra: "data", context: { foo: "bar" } } as any);
} catch (e) {
    console.error(e);
}
