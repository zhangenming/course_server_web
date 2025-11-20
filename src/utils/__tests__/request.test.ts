import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiJson } from '../request'

// Mock fetch API
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
  token: 'test-token'
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('apiJson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset location for consistent testing
    delete (window as any).location
    window.location = { origin: 'http://localhost:5173' } as any
  })

  describe('列表数据处理', () => {
    it('应该正确处理包含items、page、pagesize、total的列表数据', async () => {
      const mockListData = {
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
          { id: 3, name: 'Item 3' }
        ],
        page: 1,
        pagesize: 10,
        total: 25
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockListData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/test')

      expect(result).toEqual({
        data: mockListData.items,
        pagination: {
          page: mockListData.page,
          pagesize: mockListData.pagesize,
          total: mockListData.total
        }
      })
    })

    it('应该处理空的列表数据', async () => {
      const mockEmptyListData = {
        items: [],
        page: 1,
        pagesize: 10,
        total: 0
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockEmptyListData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/empty')

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          pagesize: 10,
          total: 0
        }
      })
    })

    it('应该处理包含复杂对象的列表数据', async () => {
      const mockComplexListData = {
        items: [
          {
            id: 1,
            user: { name: 'John', age: 30 },
            tags: ['tag1', 'tag2'],
            metadata: { created: '2023-01-01', updated: '2023-01-02' }
          }
        ],
        page: 1,
        pagesize: 20,
        total: 1
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockComplexListData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/complex')

      expect(result).toEqual({
        data: mockComplexListData.items,
        pagination: {
          page: 1,
          pagesize: 20,
          total: 1
        }
      })
    })
  })

  describe('对象数据处理', () => {
    it('应该正确处理标准对象数据（包含data字段）', async () => {
      const mockStandardData = {
        data: { id: 1, name: 'Test Item', status: 'active' },
        message: 'Success',
        code: 200
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockStandardData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/standard')

      expect(result).toEqual(mockStandardData.data)
    })

    it('应该处理直接的对象数据（不包含data字段）', async () => {
      const mockDirectData = {
        id: 1,
        name: 'Direct Item',
        description: 'This is a direct object'
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockDirectData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/direct')

      expect(result).toEqual(mockDirectData)
    })

    it('应该处理空对象', async () => {
      const mockEmptyData = {}

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockEmptyData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/empty-object')

      expect(result).toEqual(mockEmptyData)
    })

    it('应该处理null数据', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(null),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/null')

      expect(result).toBeNull()
    })
  })

  describe('错误处理', () => {
    it('应该正确处理HTTP错误', async () => {
      const mockErrorData = {
        message: '用户未找到',
        code: 404
      }

      const mockResponse = {
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue(mockErrorData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(apiJson('/api/error')).rejects.toThrow('用户未找到')
    })

    it('应该处理拼写错误的message字段', async () => {
      const mockErrorData = {
        messgae: '服务器内部错误',  // 拼写错误
        code: 500
      }

      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue(mockErrorData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(apiJson('/api/typo-error')).rejects.toThrow('服务器内部错误')
    })

    it('应该处理detail字段的错误', async () => {
      const mockErrorData = {
        detail: '权限不足',
        status: 403
      }

      const mockResponse = {
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue(mockErrorData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(apiJson('/api/forbidden')).rejects.toThrow('权限不足')
    })

    it('应该处理无错误信息的HTTP错误', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(apiJson('/api/empty-error')).rejects.toThrow('请求失败(500)')
    })

    it('应该处理JSON解析错误', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(apiJson('/api/invalid-json')).rejects.toThrow('请求失败(500)')
    })
  })

  describe('边界情况', () => {
    it('应该处理非列表格式但包含部分列表字段的数据', async () => {
      const mockPartialData = {
        items: 'not an array',  // 不是数组
        page: 1,
        pagesize: 10,
        total: 0
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockPartialData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/partial')

      // 由于items不是数组，不应该被识别为列表响应
      expect(result).toEqual(mockPartialData)
    })

    it('应该处理包含data字段的列表数据', async () => {
      const mockListWithData = {
        data: { items: [1, 2, 3] },  // 有data字段，但本身是列表格式
        items: [4, 5, 6],
        page: 1,
        pagesize: 10,
        total: 2
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockListWithData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/complex-list')

      // 应该优先识别为列表格式
      expect(result).toEqual({
        data: [4, 5, 6],
        pagination: {
          page: 1,
          pagesize: 10,
          total: 2
        }
      })
    })

    it('应该处理数组数据', async () => {
      const mockArrayData = [1, 2, 3, 4, 5]

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockArrayData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/array')

      expect(result).toEqual(mockArrayData)
    })

    it('应该处理字符串数据', async () => {
      const mockStringData = 'Hello World'

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockStringData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/string')

      expect(result).toEqual(mockStringData)
    })

    it('应该处理数字数据', async () => {
      const mockNumberData = 42

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockNumberData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/number')

      expect(result).toEqual(mockNumberData)
    })
  })

  describe('向后兼容性', () => {
    it('应该保持对现有代码的向后兼容', async () => {
      const mockStandardData = {
        data: { result: 'success' },
        status: 'ok'
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockStandardData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/compatible')

      // 应该返回data字段的内容，保持原有行为
      expect(result).toEqual({ result: 'success' })
    })

    it('应该处理不包含data字段的对象', async () => {
      const mockDirectData = {
        id: 1,
        name: 'Test',
        value: 'direct'
      }

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockDirectData),
        headers: new Headers()
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await apiJson('/api/direct-object')

      // 应该返回整个对象，保持原有行为
      expect(result).toEqual(mockDirectData)
    })
  })
})