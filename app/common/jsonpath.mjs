import { JSONPath } from 'jsonpath-plus';

function query(data, expression) {
  return JSONPath({
    json: data,
    path: expression,
    eval: false,
  });
}

function apply(data, expression, transform) {
  const matches = JSONPath({
    json: data,
    path: expression,
    resultType: 'all',
    eval: false,
  });

  for (const { parent, parentProperty, value } of matches) {
    parent[parentProperty] = transform(value);
  }

  return data;
}

export default { apply, query };
