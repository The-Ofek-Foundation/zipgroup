'use server';
/**
 * @fileOverview Suggests an icon based on the link group name.
 *
 * - suggestIcon - A function that suggests an icon based on the link group name.
 * - SuggestIconInput - The input type for the suggestIcon function.
 * - SuggestIconOutput - The return type for the suggestIcon function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestIconInputSchema = z.object({
  groupName: z.string().describe('The name of the link group.'),
});
export type SuggestIconInput = z.infer<typeof SuggestIconInputSchema>;

const SuggestIconOutputSchema = z.object({
  iconName: z.string().describe('The suggested icon name.'),
});
export type SuggestIconOutput = z.infer<typeof SuggestIconOutputSchema>;

export async function suggestIcon(input: SuggestIconInput): Promise<SuggestIconOutput> {
  return suggestIconFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIconPrompt',
  input: {schema: SuggestIconInputSchema},
  output: {schema: SuggestIconOutputSchema},
  prompt: `Suggest a relevant icon name for the link group "{{{groupName}}}". The icon name should be a valid MUI icon name. Only respond with the icon name. Do not include any other explanation.`,
});

const suggestIconFlow = ai.defineFlow(
  {
    name: 'suggestIconFlow',
    inputSchema: SuggestIconInputSchema,
    outputSchema: SuggestIconOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
