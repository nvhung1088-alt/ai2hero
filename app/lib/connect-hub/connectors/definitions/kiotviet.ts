import { ConnectorDefinition } from '../types';

export const kiotvietConnector: ConnectorDefinition = {
  slug: 'kiotviet',
  name: 'KiotViet',
  icon: 'ShoppingCart',
  category: 'pos',
  description: 'Đồng bộ sản phẩm, tồn kho, đơn hàng, khách hàng từ tài khoản KiotViet Việt Nam.',
  authType: 'client_credentials',
  authFields: [
    {
      name: 'retailer',
      label: 'Tên gian hàng (Retailer)',
      type: 'text',
      required: true,
      placeholder: 'vd: mycosmeticshop',
      helpText: 'Tên viết liền không dấu, là tên miền phụ truy cập KiotViet của bạn.'
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      placeholder: 'Nhập Client ID do KiotViet cung cấp'
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Nhập Client Secret'
    }
  ],
  badge: {
    text: 'Retail',
    variant: 'default'
  },
  lifecycle: {
    updatePolicy: 'manual',
    healthCheckEndpoint: '/branches'
  },
  status: 'ready',
  popular: true,
  actions: [
    // === Nhóm Sản phẩm & Kho (3) ===
    {
      slug: 'list_products',
      name: 'Danh sách sản phẩm',
      description: 'Truy cập và tải danh sách toàn bộ sản phẩm từ KiotViet.',
      group: 'Sản phẩm & Kho',
      httpMethod: 'GET',
      endpoint: '/products',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20',
          helpText: 'Số lượng sản phẩm lấy về trên một trang (tối đa 100).'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Bắt đầu từ bản ghi thứ N. Mặc định 0.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_products với các tham số tương ứng.\nBước 2: Đọc mảng data trả về để phân tích sản phẩm (mã SKU, tên sản phẩm, giá bán, tồn kho).',
      testStrategy: 'direct'
    },
    {
      slug: 'get_product',
      name: 'Chi tiết sản phẩm',
      description: 'Lấy thông tin chi tiết và danh sách các biến thể của sản phẩm theo ID.',
      group: 'Sản phẩm & Kho',
      httpMethod: 'GET',
      endpoint: '/products/{productId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'productId',
          label: 'Mã ID sản phẩm KiotViet',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 1000023'
        }
      ],
      outputFields: ['id', 'code', 'name', 'images', 'basePrice', 'fullName', 'categoryName', 'inventories'],
      aiInstruction: 'Bước 1: Nhận ID sản phẩm cần kiểm tra.\nBước 2: Gọi Action get_product.\nBước 3: Phân tích thông tin chi tiết sản phẩm và lượng tồn kho thực tế ở các chi nhánh.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_products',
        path: 'data[0].id',
        inputKey: 'productId'
      }
    },
    {
      slug: 'list_categories',
      name: 'Danh sách nhóm hàng hóa',
      description: 'Tải danh mục các nhóm hàng hóa đã định cấu hình trên KiotViet.',
      group: 'Sản phẩm & Kho',
      httpMethod: 'GET',
      endpoint: '/categories',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Bắt đầu từ bản ghi thứ N. Mặc định 0.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_categories.\nBước 2: Sử dụng danh sách nhóm hàng hóa này để giúp người dùng phân loại hoặc lọc danh mục sản phẩm.',
      testStrategy: 'direct'
    },

    // === Nhóm Đơn hàng (2) ===
    {
      slug: 'list_orders',
      name: 'Danh sách đơn đặt hàng',
      description: 'Lấy danh sách các đơn đặt hàng (Orders) phát sinh trong hệ thống.',
      group: 'Đơn hàng',
      httpMethod: 'GET',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Bắt đầu từ bản ghi thứ N. Mặc định 0.'
        },
        {
          name: 'fromPurchaseDate',
          label: 'Từ ngày tạo đơn',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Lọc đơn đặt hàng từ ngày này (ISO 8601, vd: 2026-06-01)'
        },
        {
          name: 'toPurchaseDate',
          label: 'Đến ngày tạo đơn',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Lọc đơn đặt hàng đến ngày này (ISO 8601, vd: 2026-06-30)'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Nhập ID chi nhánh'
        },
        {
          name: 'status',
          label: 'Trạng thái đơn hàng',
          type: 'select',
          required: false,
          options: ['Tất cả', '1', '2', '3'],
          helpText: '1: Mới, 2: Đã hủy, 3: Đang xử lý. Để trống để lấy tất cả.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Nhận khoảng thời gian hoặc tham số lọc.\nBước 2: Gọi Action list_orders.\nBước 3: Phân tích mảng data. Lưu ý các mã trạng thái đơn hàng (status):\n- 1: Mới (Đặt hàng mới)\n- 2: Đã hủy\n- 3: Đang xử lý',
      testStrategy: 'direct'
    },
    {
      slug: 'get_order',
      name: 'Chi tiết đơn đặt hàng',
      description: 'Xem chi tiết một đơn đặt hàng cụ thể bao gồm các mặt hàng đặt mua.',
      group: 'Đơn hàng',
      httpMethod: 'GET',
      endpoint: '/orders/{orderId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'orderId',
          label: 'Mã ID đơn hàng KiotViet',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 1000054'
        }
      ],
      outputFields: ['id', 'code', 'total', 'totalPayment', 'status', 'customerName', 'orderDetails'],
      aiInstruction: 'Bước 1: Gọi Action get_order với mã orderId.\nBước 2: Phân tích các sản phẩm đặt mua, tổng tiền hàng và thông tin thanh toán dự kiến.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_orders',
        path: 'data[0].id',
        inputKey: 'orderId'
      }
    },
    {
      slug: 'create_order',
      name: 'Tạo đơn đặt hàng mới',
      description: 'Tạo một đơn đặt hàng mới (Order) trên hệ thống KiotViet.',
      group: 'Đơn hàng',
      httpMethod: 'POST',
      endpoint: '/orders',
      status: 'ready',
      inputSchema: [
        {
          name: 'payload',
          label: 'Dữ liệu JSON đơn hàng',
          type: 'text',
          required: true,
          placeholder: 'Nhập chuỗi JSON chứa thông tin đơn hàng (branchId, orderDetails...)'
        }
      ],
      outputFields: ['id', 'code', 'total', 'status'],
      aiInstruction: 'Bước 1: Chuẩn bị đối tượng payload chứa thông tin đơn hàng.\nBước 2: Gọi Action create_order.\nBước 3: Trả về mã đơn hàng (code) vừa được tạo thành công.',
      testStrategy: 'direct'
    },

    // === Nhóm Hóa đơn (2) ===
    {
      slug: 'list_invoices',
      name: 'Danh sách hóa đơn',
      description: 'Lấy danh sách các hóa đơn bán lẻ (Invoices) đã hoàn thành xuất kho.',
      group: 'Hóa đơn',
      httpMethod: 'GET',
      endpoint: '/invoices',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Bắt đầu từ bản ghi thứ N. Mặc định 0.'
        },
        {
          name: 'fromPurchaseDate',
          label: 'Từ ngày hóa đơn',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Lọc hóa đơn từ ngày này (ISO 8601, vd: 2026-06-01)'
        },
        {
          name: 'toPurchaseDate',
          label: 'Đến ngày hóa đơn',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Lọc hóa đơn đến ngày này (ISO 8601, vd: 2026-06-30)'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Nhập ID chi nhánh'
        },
        {
          name: 'status',
          label: 'Trạng thái hóa đơn',
          type: 'select',
          required: false,
          options: ['Tất cả', '1', '2', '3', '5'],
          helpText: '1: Hoàn thành, 2: Đã hủy, 3: Đang xử lý, 5: Không giao được. Để trống để lấy tất cả.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_invoices với các tham số ngày và chi nhánh nếu có.\nBước 2: Phân tích mảng hóa đơn để tính toán doanh thu thực tế. Lưu ý mã trạng thái hóa đơn (status):\n- 1: Hoàn thành\n- 2: Đã hủy\n- 3: Đang xử lý\n- 5: Không giao được',
      testStrategy: 'direct'
    },
    {
      slug: 'get_invoice',
      name: 'Chi tiết hóa đơn',
      description: 'Xem thông tin chi tiết một hóa đơn bán hàng bao gồm các mặt hàng và tiền thanh toán.',
      group: 'Hóa đơn',
      httpMethod: 'GET',
      endpoint: '/invoices/{invoiceId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'invoiceId',
          label: 'Mã ID hóa đơn KiotViet',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 1000087'
        }
      ],
      outputFields: ['id', 'code', 'total', 'totalPayment', 'status', 'customerName', 'invoiceDetails'],
      aiInstruction: 'Bước 1: Nhận mã invoiceId cần xem.\nBước 2: Gọi Action get_invoice.\nBước 3: Hiển thị đầy đủ thông tin hàng bán lẻ và giá trị chiết khấu, khách đã trả.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_invoices',
        path: 'data[0].id',
        inputKey: 'invoiceId'
      }
    },

    // === Nhóm Khách hàng CRM (2) ===
    {
      slug: 'list_customers',
      name: 'Danh sách khách hàng',
      description: 'Tải danh bạ CRM khách hàng đã từng lưu trữ trên hệ thống KiotViet.',
      group: 'Khách hàng CRM',
      httpMethod: 'GET',
      endpoint: '/customers',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Bắt đầu từ bản ghi thứ N. Mặc định 0.'
        },
        {
          name: 'includeTotal',
          label: 'Bao gồm tổng chi tiêu & nợ',
          type: 'text',
          required: false,
          placeholder: 'true',
          helpText: 'Nhập "true" để lấy thêm thông tin công nợ và tổng tiền mua của khách.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_customers.\nBước 2: Phân tích danh sách ID khách hàng mua nhiều nhất. Dữ liệu cá nhân khách hàng trong log sẽ được tự động bảo vệ.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_customer',
      name: 'Chi tiết khách hàng',
      description: 'Lấy hồ sơ cá nhân chi tiết của khách hàng kèm lịch sử mua sắm và công nợ hiện tại.',
      group: 'Khách hàng CRM',
      httpMethod: 'GET',
      endpoint: '/customers/{customerId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'customerId',
          label: 'Mã ID khách hàng KiotViet',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 1000099'
        }
      ],
      outputFields: ['id', 'code', 'name', 'contactNumber', 'email', 'totalInvoiced', 'debt'],
      aiInstruction: 'Bước 1: Gọi Action get_customer với mã customerId.\nBước 2: Phân tích công nợ (debt) và tổng tiền đã tích lũy (totalInvoiced) để đề xuất chương trình chăm sóc khách hàng.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_customers',
        path: 'data[0].id',
        inputKey: 'customerId'
      }
    },

    // === Nhóm Trả hàng (2) ===
    {
      slug: 'list_returns',
      name: 'Danh sách phiếu trả hàng',
      description: 'Lấy danh sách các phiếu khách trả lại hàng đã thực hiện trên KiotViet.',
      group: 'Trả hàng',
      httpMethod: 'GET',
      endpoint: '/returns',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0'
        },
        {
          name: 'fromPurchaseDate',
          label: 'Từ ngày trả hàng',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'toPurchaseDate',
          label: 'Đến ngày trả hàng',
          type: 'text',
          required: false,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Nhập ID chi nhánh'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_returns để lấy danh sách phiếu trả hàng.\nBước 2: Phân tích lượng tiền trả khách để tính toán doanh thu thuần chính xác.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_return',
      name: 'Chi tiết phiếu trả hàng',
      description: 'Xem chi tiết một phiếu trả hàng cụ thể bao gồm danh sách mặt hàng và số tiền trả lại khách.',
      group: 'Trả hàng',
      httpMethod: 'GET',
      endpoint: '/returns/{returnId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'returnId',
          label: 'Mã ID phiếu trả hàng',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 1000034'
        }
      ],
      outputFields: ['id', 'code', 'returnTotal', 'totalPayment', 'returnDetails', 'status', 'branchId'],
      aiInstruction: 'Bước 1: Gọi Action get_return với returnId.\nBước 2: Xem chi tiết các sản phẩm khách trả lại và số tiền thực tế đã hoàn trả.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_returns',
        path: 'data[0].id',
        inputKey: 'returnId'
      }
    },

    // === Nhóm Nhà cung cấp (2) ===
    {
      slug: 'list_suppliers',
      name: 'Danh sách nhà cung cấp',
      description: 'Lấy danh sách các nhà cung cấp sản phẩm cho cửa hàng.',
      group: 'Nhà cung cấp',
      httpMethod: 'GET',
      endpoint: '/suppliers',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0'
        },
        {
          name: 'name',
          label: 'Tên nhà cung cấp',
          type: 'text',
          required: false,
          placeholder: 'Nhập tên cần tìm'
        },
        {
          name: 'contactNumber',
          label: 'Số điện thoại',
          type: 'text',
          required: false,
          placeholder: 'Nhập SĐT cần tìm'
        },
        {
          name: 'includeTotal',
          label: 'Bao gồm công nợ',
          type: 'text',
          required: false,
          placeholder: 'true',
          helpText: 'Nhập "true" để lấy thêm thông tin nợ cần trả nhà cung cấp.'
        }
      ],
      outputFields: ['data', 'total', 'pageSize'],
      aiInstruction: 'Bước 1: Gọi Action list_suppliers để lấy danh sách nhà cung cấp.\nBước 2: Tìm hiểu công nợ và lịch sử nhập hàng từ các nhà cung cấp.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_supplier',
      name: 'Chi tiết nhà cung cấp',
      description: 'Xem thông tin hồ sơ chi tiết và công nợ hiện tại của nhà cung cấp.',
      group: 'Nhà cung cấp',
      httpMethod: 'GET',
      endpoint: '/suppliers/{supplierId}',
      status: 'ready',
      inputSchema: [
        {
          name: 'supplierId',
          label: 'Mã ID nhà cung cấp',
          type: 'text',
          required: true,
          placeholder: 'Ví dụ: 100023'
        }
      ],
      outputFields: ['id', 'code', 'name', 'contactNumber', 'debt', 'totalInvoiced'],
      aiInstruction: 'Bước 1: Gọi Action get_supplier với supplierId.\nBước 2: Phân tích công nợ và thông tin chi tiết nhà cung cấp.',
      testStrategy: 'requires_sample',
      sampleFrom: {
        actionSlug: 'list_suppliers',
        path: 'data[0].id',
        inputKey: 'supplierId'
      }
    },

    // === Nhóm Nhân viên (1) ===
    {
      slug: 'list_users',
      name: 'Danh sách nhân viên',
      description: 'Lấy danh sách tài khoản nhân viên hoạt động trên hệ thống cửa hàng.',
      group: 'Nhân viên',
      httpMethod: 'GET',
      endpoint: '/users',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '20'
        },
        {
          name: 'currentItem',
          label: 'Bỏ qua N bản ghi đầu',
          type: 'text',
          required: false,
          placeholder: '0'
        }
      ],
      outputFields: ['data', 'total'],
      aiInstruction: 'Bước 1: Gọi Action list_users để lấy danh sách nhân viên trong hệ thống.',
      testStrategy: 'direct'
    },

    // === Nhóm Báo cáo & Thống kê (6 - Composite) ===
    {
      slug: 'get_revenue_summary',
      name: 'Báo cáo doanh thu tổng quan',
      description: 'Tính toán doanh thu, số lượng hóa đơn, giá trị đơn trung bình và tỷ trọng trạng thái hóa đơn theo khoảng thời gian.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'fromDate',
          label: 'Từ ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Bắt đầu từ ngày này (vd: 2026-06-01)'
        },
        {
          name: 'toDate',
          label: 'Đến ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD',
          helpText: 'Đến hết ngày này (vd: 2026-06-30)'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Để trống để tính toàn bộ'
        }
      ],
      outputFields: [
        'totalRevenue', 'netRevenue', 'totalDiscount', 'totalSurcharge', 
        'totalPayment', 'debtGenerated', 'totalOrders', 'avgOrderValue', 
        'period', 'byStatus', 'invoiceCount', 'note'
      ],
      aiInstruction: 'Dùng để tổng hợp doanh thu theo khoảng thời gian. Kết quả bao gồm Doanh thu tổng (totalRevenue), Doanh thu thuần (netRevenue = tổng - giảm giá + phụ thu), Thực thu (totalPayment) và Phát sinh nợ (debtGenerated). Input fromDate/toDate là bắt buộc.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_top_products',
      name: 'Báo cáo top sản phẩm bán chạy',
      description: 'Tổng hợp danh sách các sản phẩm bán chạy nhất dựa trên dữ liệu hóa đơn trong khoảng thời gian.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'fromDate',
          label: 'Từ ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'toDate',
          label: 'Đến ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'topN',
          label: 'Số lượng sản phẩm top',
          type: 'text',
          required: false,
          placeholder: '10',
          helpText: 'Số lượng sản phẩm muốn trả về. Mặc định là 10.'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Để trống để lấy toàn bộ'
        }
      ],
      outputFields: ['topProducts', 'period', 'totalAnalyzed', 'note'],
      aiInstruction: 'Trả về top N sản phẩm bán chạy nhất theo doanh thu và số lượng dựa trên hóa đơn trong khoảng thời gian.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_branch',
      name: 'Doanh thu theo chi nhánh',
      description: 'Phân tích và so sánh doanh thu kinh doanh giữa các chi nhánh cửa hàng.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'fromDate',
          label: 'Từ ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'toDate',
          label: 'Đến ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        }
      ],
      outputFields: ['branches', 'period', 'totalRevenue', 'note'],
      aiInstruction: 'Thống kê doanh số bán ra theo từng chi nhánh để so sánh hiệu quả kinh doanh vùng miền.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_sales_by_employee',
      name: 'Doanh thu theo nhân viên',
      description: 'Thống kê doanh số bán ra và số lượng hóa đơn do mỗi nhân viên thực hiện.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'fromDate',
          label: 'Từ ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'toDate',
          label: 'Đến ngày (Bắt buộc)',
          type: 'text',
          required: true,
          placeholder: 'YYYY-MM-DD'
        },
        {
          name: 'branchId',
          label: 'ID Chi nhánh',
          type: 'text',
          required: false,
          placeholder: 'Để trống để lấy toàn bộ'
        }
      ],
      outputFields: ['employees', 'period', 'totalRevenue', 'note'],
      aiInstruction: 'Thống kê doanh số theo nhân viên hỗ trợ việc tính thưởng doanh số hoặc đánh giá hiệu quả làm việc.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_customer_debt_report',
      name: 'Báo cáo nợ khách hàng phải thu',
      description: 'Liệt kê danh sách khách hàng đang có công nợ nhiều nhất tại cửa hàng.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng tối đa / trang',
          type: 'text',
          required: false,
          placeholder: '50'
        },
        {
          name: 'minDebt',
          label: 'Nợ tối thiểu để hiện thị',
          type: 'text',
          required: false,
          placeholder: '0',
          helpText: 'Chỉ hiển thị các khách hàng có nợ lớn hơn con số này.'
        }
      ],
      outputFields: ['customers', 'totalDebt', 'count'],
      aiInstruction: 'Báo cáo công nợ khách hàng, sắp xếp theo nợ giảm dần phục vụ việc nhắc nợ thu hồi vốn.',
      testStrategy: 'direct'
    },
    {
      slug: 'get_inventory_report',
      name: 'Báo cáo tổng hợp tồn kho',
      description: 'Tổng hợp số lượng sản phẩm tồn kho và chi tiết phân bố lượng tồn ở các chi nhánh.',
      group: 'Báo cáo & Thống kê',
      httpMethod: 'GET',
      endpoint: 'composite',
      status: 'ready',
      inputSchema: [
        {
          name: 'pageSize',
          label: 'Số lượng sản phẩm lấy về',
          type: 'text',
          required: false,
          placeholder: '100',
          helpText: 'Tối đa 100 sản phẩm được phân tích tồn kho.'
        },
        {
          name: 'categoryId',
          label: 'ID Nhóm hàng hóa',
          type: 'text',
          required: false,
          placeholder: 'Để trống để lấy toàn bộ'
        }
      ],
      outputFields: ['products', 'totalProducts'],
      aiInstruction: 'Báo cáo tồn kho tổng hợp theo chi nhánh để tối ưu điều chuyển hàng hóa hoặc lên kế hoạch nhập hàng.',
      testStrategy: 'direct'
    },

    // === Tiện ích & Hỗ trợ (2) ===
    {
      slug: 'list_branches',
      name: 'Danh sách chi nhánh',
      description: 'Lấy danh sách các chi nhánh của cửa hàng KiotViet.',
      group: 'Tiện ích & Hỗ trợ',
      httpMethod: 'GET',
      endpoint: '/branches',
      status: 'ready',
      inputSchema: [],
      outputFields: ['data', 'total'],
      aiInstruction: 'Bước 1: Gọi Action list_branches.\nBước 2: Trả về danh sách chi nhánh phục vụ việc lọc dữ liệu tồn kho theo khu vực.',
      testStrategy: 'direct'
    },
    {
      slug: 'probe_sample_data',
      name: 'Dò cấu trúc dữ liệu',
      description: 'Dò nhanh cấu trúc dữ liệu mẫu của Sản phẩm, Đơn đặt hàng và Hóa đơn để thiết lập ánh xạ.',
      group: 'Tiện ích & Hỗ trợ',
      httpMethod: 'GET',
      endpoint: '/probe',
      status: 'ready',
      inputSchema: [],
      outputFields: ['product', 'order', 'invoice', 'customer'],
      aiInstruction: 'Bước 1: Gọi Action probe_sample_data.\nBước 2: Hệ thống tự động fetch bản ghi đầu tiên của sản phẩm, đơn hàng, hóa đơn và khách hàng làm mẫu cấu trúc phục vụ việc mapping.',
      testStrategy: 'direct'
    }
  ],
  setupGuide: '<p><b>1.</b> Đăng nhập KiotViet, góc trên bên phải chọn <b>Thiết lập &gt; Thiết lập cửa hàng</b>.</p><p><b>2.</b> Chuyển sang thẻ <b>Quản lý API</b>, nhấn <b>Thêm mới</b> để sinh ra <b>Client ID</b> và <b>Client Secret</b>.</p><p><b>3.</b> <b>Tên gian hàng</b> chính là tên trên link web của bạn (ví dụ: <code>my-shop.kiotviet.vn</code> thì Tên gian hàng là <code>my-shop</code>).</p>'
};
