import { NextResponse } from 'next/server';

export async function GET() {
  const token = 'vcp_487DLv5w25Xi6Tflt7cevFhOlp9Q4nXNmphhEQxDFitC63CkVt4WshV3';
  const projectId = 'prj_y5dZBtYBZtJEC24fg4u2h3MctcUX';

  try {
    // Get Github Repo ID
    const ghRes = await fetch('https://api.github.com/repos/shivamks0909/cl', {
      headers: { 'User-Agent': 'Node.js' }
    });
    const ghData = await ghRes.json();
    const repoId = ghData.id;

    if (!repoId) {
      return NextResponse.json({ error: 'Could not fetch repo ID', ghData }, { status: 500 });
    }

    // Trigger Vercel Deploy
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'april',
        project: projectId,
        target: 'production',
        gitSource: {
          type: 'github',
          repoId: repoId,
          ref: 'main'
        }
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, repoId, vercelResponse: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
