type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

type StructuredDataProps = {
  data: StructuredDataValue;
};

function serializeStructuredData(data: StructuredDataValue) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
    />
  );
}
