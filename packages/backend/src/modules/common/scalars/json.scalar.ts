import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('JSON', () => Object)
export class JSONScalar implements CustomScalar<string, any> {
  description = 'JSON custom scalar type';

  parseValue(value: any): any {
    return value;
  }

  serialize(value: any): any {
    return value;
  }

  parseLiteral(ast: ValueNode): any {
    switch (ast.kind) {
      case Kind.STRING: return (ast as any).value;
      case Kind.OBJECT: {
        const result: Record<string, any> = {};
        for (const field of (ast as any).fields) {
          result[field.name.value] = this.parseLiteral(field.value);
        }
        return result;
      }
      case Kind.LIST: return (ast as any).values.map((v: ValueNode) => this.parseLiteral(v));
      case Kind.INT: return parseInt((ast as any).value, 10);
      case Kind.FLOAT: return parseFloat((ast as any).value);
      case Kind.BOOLEAN: return (ast as any).value;
      case Kind.NULL: return null;
      default: return (ast as any).value;
    }
  }
}
