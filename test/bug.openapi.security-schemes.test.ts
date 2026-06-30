//the issue: old spec on apiHub was incorrect, i.e. missed a required fields
//fixing the old spec (adding required fields) should be a non-breaking change

import {
  apiDiff,
  breaking,
  CompareOptions,
  DiffAction,
  nonBreaking,
} from '../src';
import { diffsMatcher } from './helper/matchers';
import { TEST_DIFF_FLAG, TEST_ORIGINS_FLAG } from './helper';

const TEST_COMPARE_OPTIONS: CompareOptions = {
  originsFlag: TEST_ORIGINS_FLAG,
  metaKey: TEST_DIFF_FLAG,
  validate: true,
  unify: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
};

const BASE = {
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
};

describe('security scheme / type field', () => {
  it('adding type is non-breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { in: 'header', name: 'X-Key' } },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'X-Key' },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'type'],
          ],
          type: nonBreaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('changing type is breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'X-Key' },
        },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'http', scheme: 'bearer' } },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'type'],
          ],
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'type'],
          ],
          type: breaking,
          scope: 'components',
        }),
      ]),
    );
  });
});

describe('security scheme / apiKey fields (name, in)', () => {
  it('adding name is non-breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'apiKey', in: 'header' } },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'name'],
          ],
          type: nonBreaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('adding in is non-breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'apiKey', name: 'X-API-Key' } },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', name: 'X-API-Key', in: 'header' },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'in'],
          ],
          type: nonBreaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('changing name is breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'Authorization' },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'name'],
          ],
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'name'],
          ],
          type: breaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('changing in is breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'apiKey', in: 'query', name: 'X-API-Key' },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'in'],
          ],
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'in'],
          ],
          type: breaking,
          scope: 'components',
        }),
      ]),
    );
  });
});

describe('security scheme / http fields (scheme)', () => {
  it('adding scheme is non-breaking', () => {
    const before = {
      ...BASE,
      components: { securitySchemes: { Auth: { type: 'http' } } },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'http', scheme: 'bearer' } },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'scheme'],
          ],
          type: nonBreaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('changing scheme is breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'http', scheme: 'bearer' } },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: { Auth: { type: 'http', scheme: 'basic' } },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.replace,
          beforeDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'scheme'],
          ],
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'scheme'],
          ],
          type: breaking,
          scope: 'components',
        }),
      ]),
    );
  });
});

const clientCredentialsFlow = {
  clientCredentials: {
    tokenUrl: 'https://example.com/token',
    scopes: { 'read:api': 'Read access' },
  },
};

const authorizationCodeFlow = {
  authorizationCode: {
    authorizationUrl: 'https://example.com/auth',
    tokenUrl: 'https://example.com/token',
    scopes: { 'read:api': 'Read access' },
  },
};

describe('security scheme / oauth2 fields (flows)', () => {
  it('adding flows is non-breaking', () => {
    const before = {
      ...BASE,
      components: { securitySchemes: { Auth: { type: 'oauth2' } } },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'oauth2', flows: clientCredentialsFlow },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            ['components', 'securitySchemes', 'Auth', 'flows'],
          ],
          type: nonBreaking,
          scope: 'components',
        }),
      ]),
    );
  });

  it('adding a flow type to an existing flows object is breaking', () => {
    const before = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: { type: 'oauth2', flows: clientCredentialsFlow },
        },
      },
    };
    const after = {
      ...BASE,
      components: {
        securitySchemes: {
          Auth: {
            type: 'oauth2',
            flows: { ...clientCredentialsFlow, ...authorizationCodeFlow },
          },
        },
      },
    };
    const { diffs } = apiDiff(before, after, TEST_COMPARE_OPTIONS);
    expect(diffs).toEqual(
      diffsMatcher([
        expect.objectContaining({
          action: DiffAction.add,
          afterDeclarationPaths: [
            [
              'components',
              'securitySchemes',
              'Auth',
              'flows',
              'authorizationCode',
            ],
          ],
          type: breaking,
          scope: 'components',
        }),
      ]),
    );
  });
});
