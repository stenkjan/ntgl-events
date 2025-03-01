'use server'

export async function submitForm(formData: FormData) {
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    consent: formData.get('consent'),
  }

  // Create the form submission body
  const body = new URLSearchParams(data as any).toString();

  try {
    const response = await fetch(process.env.NEXT_PUBLIC_SITE_URL + '/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting form:', error);
    return { success: false, error: 'Failed to submit form' };
  }
}