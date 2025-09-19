import Mustache from 'mustache';

export function extractVariables(template: string): string[] {
  const variablePattern = /\{\{([^#/][^}]+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    const variable = match[1].trim();
    if (variable && !variable.startsWith('!')) {
      variables.add(variable);
    }
  }

  return Array.from(variables);
}

export function renderTemplate(template: string, data: Record<string, any>): string {
  try {
    // Add built-in variables
    const enrichedData = {
      ...data,
      today: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
    };

    return Mustache.render(template, enrichedData);
  } catch (error) {
    console.error('Template rendering error:', error);
    return template;
  }
}

export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Try to parse the template
    Mustache.parse(template);
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
  }

  // Check for common issues
  if (template.length > 2500) {
    errors.push('Template is too long (max 2500 characters)');
  }

  if (template.length < 10) {
    errors.push('Template is too short (min 10 characters)');
  }

  // Check for balanced brackets
  const openBrackets = (template.match(/\{\{/g) || []).length;
  const closeBrackets = (template.match(/\}\}/g) || []).length;

  if (openBrackets !== closeBrackets) {
    errors.push('Unbalanced brackets in template');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}