import { chatbotAction } from '../../actions/chatbotActions';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "La pregunta és obligatòria." }), { status: 400 });
    }

    const { data, error } = await chatbotAction(question);

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify({ data }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconegut";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
